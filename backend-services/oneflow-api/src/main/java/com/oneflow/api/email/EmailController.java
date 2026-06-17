package com.oneflow.api.email;

import com.oneflow.api.auth.CurrentUser;
import com.oneflow.api.common.ApiResponse;
import com.oneflow.api.security.AuthSupport;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/email")
public class EmailController {

    private final EmailRepository emailRepository;
    private final EmailSenderService emailSenderService;
    private final AuthSupport authSupport;

    public EmailController(EmailRepository emailRepository, EmailSenderService emailSenderService, AuthSupport authSupport) {
        this.emailRepository = emailRepository;
        this.emailSenderService = emailSenderService;
        this.authSupport = authSupport;
    }

    @GetMapping("/settings")
    public ResponseEntity<?> getSettings(@RequestHeader(value = "Authorization", required = false) String authorization) {
        CurrentUser user = authSupport.parseBearerUser(authorization);
        ResponseEntity<ApiResponse<String>> denied = requireEmailManage(user);
        if (denied != null) return denied;
        return ResponseEntity.ok(ApiResponse.success(emailRepository.getPublicSettings()));
    }

    @PutMapping("/settings")
    public ResponseEntity<?> updateSettings(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody(required = false) Map<String, Object> body) {
        CurrentUser user = authSupport.parseBearerUser(authorization);
        ResponseEntity<ApiResponse<String>> denied = requireEmailManage(user);
        if (denied != null) return denied;
        try {
            ApiResponse<Map<String, Object>> response = ApiResponse.success(emailRepository.updateSettings(body));
            response.setMessage("邮件设置已保存");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ApiResponse.<String>failure(400, ex.getMessage()));
        }
    }

    @PostMapping("/send")
    public ResponseEntity<?> send(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody(required = false) Map<String, Object> body) {
        CurrentUser user = authSupport.parseBearerUser(authorization);
        ResponseEntity<ApiResponse<String>> denied = requireEmailManage(user);
        if (denied != null) return denied;
        try {
            return ResponseEntity.ok(emailSenderService.send(body));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ApiResponse.<String>failure(400, ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.<String>failure(500, ex.getMessage()));
        }
    }

    private ResponseEntity<ApiResponse<String>> requireEmailManage(CurrentUser user) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.<String>failure(401, "未登录或登录已过期"));
        }
        if (!authSupport.hasPermission(user, "email:settings:manage")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.<String>failure(403, "Permission denied: email:settings:manage is required"));
        }
        return null;
    }
}
