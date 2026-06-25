package com.oneflow.api.audit;

import com.oneflow.api.auth.CurrentUser;
import com.oneflow.api.common.ApiResponse;
import com.oneflow.api.security.AuthSupport;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/audit-logs")
public class AuditLogController {

    private final AuditLogRepository auditLogRepository;
    private final AuthSupport authSupport;

    public AuditLogController(AuditLogRepository auditLogRepository, AuthSupport authSupport) {
        this.auditLogRepository = auditLogRepository;
        this.authSupport = authSupport;
    }

    @GetMapping
    public ResponseEntity<?> list(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(value = "userId", required = false) String userId,
            @RequestParam(value = "action", required = false) String action,
            @RequestParam(value = "resource", required = false) String resource,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "pageSize", defaultValue = "20") int pageSize) {
        ResponseEntity<ApiResponse<String>> denied = requireAuditView(authorization);
        if (denied != null) return denied;
        Map<String, Object> result = auditLogRepository.findPage(userId, action, resource, status, page, pageSize);
        Map<String, Object> response = new LinkedHashMap<String, Object>();
        response.put("success", true);
        response.putAll(result);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/actions")
    public ResponseEntity<?> actions(@RequestHeader(value = "Authorization", required = false) String authorization) {
        ResponseEntity<ApiResponse<String>> denied = requireAuditView(authorization);
        if (denied != null) return denied;
        return ResponseEntity.ok(ApiResponse.success(auditLogRepository.actions()));
    }

    private ResponseEntity<ApiResponse<String>> requireAuditView(String authorization) {
        CurrentUser user = authSupport.parseBearerUser(authorization);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.<String>failure(401, "未登录或登录已过期"));
        }
        if (!authSupport.hasPermission(user, "audit:view")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.<String>failure(403, "Permission denied: audit:view is required"));
        }
        return null;
    }
}
