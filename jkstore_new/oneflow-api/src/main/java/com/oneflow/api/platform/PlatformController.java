package com.oneflow.api.platform;

import com.oneflow.api.auth.CurrentUser;
import com.oneflow.api.common.ApiResponse;
import com.oneflow.api.security.AuthSupport;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/platforms")
public class PlatformController {

    private final PlatformRepository platformRepository;
    private final AuthSupport authSupport;

    public PlatformController(PlatformRepository platformRepository, AuthSupport authSupport) {
        this.platformRepository = platformRepository;
        this.authSupport = authSupport;
    }

    @GetMapping
    public ResponseEntity<?> list(@RequestHeader(value = "Authorization", required = false) String authorization) {
        CurrentUser user = authSupport.parseBearerUser(authorization);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.<String>failure(401, "未登录或登录已过期"));
        }
        return ResponseEntity.ok(ApiResponse.success(platformRepository.findPlatforms()));
    }

    @PutMapping
    public ResponseEntity<?> update(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody(required = false) Map<String, Object> body) {
        CurrentUser user = authSupport.parseBearerUser(authorization);
        ResponseEntity<ApiResponse<String>> denied = requireManagePermission(user);
        if (denied != null) return denied;
        try {
            Object platforms = body == null ? null : body.get("platforms");
            ApiResponse<?> response = ApiResponse.success(platformRepository.updatePlatforms(platforms));
            response.setMessage("平台配置已保存");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ApiResponse.<String>failure(400, ex.getMessage()));
        }
    }

    private ResponseEntity<ApiResponse<String>> requireManagePermission(CurrentUser user) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.<String>failure(401, "未登录或登录已过期"));
        }
        if (!authSupport.hasPermission(user, "platform:manage")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.<String>failure(403, "Permission denied: platform:manage is required"));
        }
        return null;
    }
}
