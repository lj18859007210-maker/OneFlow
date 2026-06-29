package com.oneflow.api.auth;

import com.oneflow.api.common.ApiResponse;
import com.oneflow.api.security.AuthSupport;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final CaptchaService captchaService;
    private final JwtService jwtService;
    private final SessionUserService sessionUserService;
    private final AuthSupport authSupport;
    private final RsaKeyService rsaKeyService;

    public AuthController(
            CaptchaService captchaService,
            JwtService jwtService,
            SessionUserService sessionUserService,
            AuthSupport authSupport,
            RsaKeyService rsaKeyService) {
        this.captchaService = captchaService;
        this.jwtService = jwtService;
        this.sessionUserService = sessionUserService;
        this.authSupport = authSupport;
        this.rsaKeyService = rsaKeyService;
    }

    @GetMapping("/public-key")
    public ApiResponse<String> publicKey() {
        return ApiResponse.legacy(0, rsaKeyService.getPublicKeyPem());
    }

    @GetMapping("/captcha")
    public ApiResponse<CaptchaChallenge> captcha() {
        return ApiResponse.legacy(0, captchaService.create());
    }

    @PostMapping("/login")
    public ApiResponse<Object> login(@RequestBody(required = false) LoginRequest request) {
        // 兼容旧 Node 后端：登录失败仍返回 HTTP 200 + code=500，
        // 前端当前就是按这个响应体判断登录错误，而不是按 HTTP 状态码判断。
        if (request == null || !StringUtils.hasText(request.getUsername())
                || (!StringUtils.hasText(request.getEncryptedPassword()) && !StringUtils.hasText(request.getPassword()))) {
            return ApiResponse.<Object>legacy(500, "账号和密码不能为空");
        }
        if (!captchaService.verify(request.getCaptchaId(), request.getCaptchaCode())) {
            return ApiResponse.<Object>legacy(500, "验证码错误或已过期");
        }
        // 迁移早期先支持明文 password 兜底，方便接口联调和现有测试。
        // 有 encryptedPassword 时用 RSA 解密为明文后再校验密码。
        String password;
        if (StringUtils.hasText(request.getPassword())) {
            password = request.getPassword();
        } else if (StringUtils.hasText(request.getEncryptedPassword())) {
            password = rsaKeyService.decrypt(request.getEncryptedPassword());
            if (!StringUtils.hasText(password)) {
                // 这里单独返回“解密失败”，避免把 RSA 参数不兼容误报成账号密码错误。
                // 日志只记录账号和密文长度，不记录明文密码或密文内容。
                log.info("[LOGIN] password decrypt failed username={} encryptedLength={}",
                        request.getUsername(), request.getEncryptedPassword().length());
                return ApiResponse.<Object>legacy(500, "密码解密失败，请刷新页面重试");
            }
        } else {
            password = null;
        }
        CurrentUser user = sessionUserService.login(request.getUsername(), password);
        if (user == null) {
            return ApiResponse.<Object>legacy(500, "账号或密码错误");
        }
        Map<String, Object> data = new LinkedHashMap<String, Object>();
        data.put("user", user);
        data.put("token", jwtService.createToken(user));
        return ApiResponse.<Object>legacy(0, data);
    }

    @PostMapping("/sso")
    public ResponseEntity<ApiResponse<Map<String, Object>>> sso(
            @RequestBody(required = false) Map<String, Object> body,
            HttpServletRequest request) {
        // 旧 SSO 入口会从 body/query/header 多个位置取用户名。
        // 这里保留同样的宽松入口，避免主平台跳转参数位置变化时前端受影响。
        String username = resolveUsername(body, request);
        if (!StringUtils.hasText(username)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.<Map<String, Object>>failure(401, "主平台登录态无效或已过期"));
        }

        // SSO 用户不存在时自动创建，默认 role=user。
        // 这是旧 Node ensureSsoUser 的行为，后续权限由管理员再调整。
        CurrentUser user = sessionUserService.ensureSsoUser(username);
        Map<String, Object> data = new LinkedHashMap<String, Object>();
        data.put("user", user);
        data.put("token", jwtService.createToken(user));
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<CurrentUser>> me(
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        CurrentUser user = authSupport.parseBearerUser(authorization);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.<CurrentUser>failure(401, "未登录或登录已过期"));
        }
        return ResponseEntity.ok(ApiResponse.success(user));
    }

    @PutMapping("/me/email")
    public ResponseEntity<ApiResponse<CurrentUser>> updateEmail(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody(required = false) Map<String, Object> body) {
        CurrentUser user = authSupport.parseBearerUser(authorization);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.<CurrentUser>failure(401, "未登录或登录已过期"));
        }
        String email = body == null ? "" : String.valueOf(body.get("email"));
        if (!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<CurrentUser>failure(400, "请输入有效的邮箱地址"));
        }
        user.setEmail(email);
        ApiResponse<CurrentUser> response = ApiResponse.success(user);
        response.setMessage("邮箱更新成功");
        return ResponseEntity.ok(response);
    }

    @PutMapping("/me/password")
    public ResponseEntity<ApiResponse<String>> updatePassword(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody(required = false) Map<String, Object> body) {
        CurrentUser user = authSupport.parseBearerUser(authorization);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.<String>failure(401, "未登录或登录已过期"));
        }
        String password = body == null ? "" : String.valueOf(body.get("password"));
        if (password.length() < 8) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<String>failure(400, "密码长度至少 8 位"));
        }
        ApiResponse<String> response = ApiResponse.success(null);
        response.setMessage("密码更新成功");
        return ResponseEntity.ok(response);
    }

    private String resolveUsername(Map<String, Object> body, HttpServletRequest request) {
        String[] fields = {"jkUsername", "username", "login_user", "userName", "loginName", "account", "name"};
        for (String field : fields) {
            String value = valueFromBody(body, field);
            if (StringUtils.hasText(value)) {
                return value.trim();
            }
            value = request.getParameter(field);
            if (StringUtils.hasText(value)) {
                return value.trim();
            }
        }
        return firstHeader(request, "x-jk-username", "x-username", "x-login-user");
    }

    private String valueFromBody(Map<String, Object> body, String field) {
        if (body == null || body.get(field) == null) {
            return null;
        }
        return String.valueOf(body.get(field));
    }

    private String firstHeader(HttpServletRequest request, String... names) {
        for (String name : names) {
            String value = request.getHeader(name);
            if (StringUtils.hasText(value)) {
                return value.trim();
            }
        }
        return null;
    }
}
