package com.oneflow.api.user;

import com.oneflow.api.auth.CurrentUser;
import com.oneflow.api.common.ApiResponse;
import com.oneflow.api.security.AuthSupport;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final AuthSupport authSupport;

    public UserController(UserRepository userRepository, AuthSupport authSupport) {
        this.userRepository = userRepository;
        this.authSupport = authSupport;
    }

    @GetMapping
    public ResponseEntity<?> all(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "pageSize", defaultValue = "10") int pageSize,
            @RequestParam(value = "role", required = false) String role,
            @RequestParam(value = "keyword", required = false) String keyword) {
        ResponseEntity<ApiResponse<String>> denied = requireUserRoleManage(authorization);
        if (denied != null) {
            return denied;
        }
        Map<String, Object> result = userRepository.findPage(page, pageSize, role, keyword);
        java.util.Map<String, Object> response = new java.util.LinkedHashMap<String, Object>();
        response.put("success", true);
        response.put("data", result.get("data"));
        response.put("total", result.get("total"));
        response.put("page", result.get("page"));
        response.put("pageSize", result.get("pageSize"));
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/role")
    public ResponseEntity<?> updateRole(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable String id,
            @RequestBody Map<String, Object> body) {
        ResponseEntity<ApiResponse<String>> denied = requireUserRoleManage(authorization);
        if (denied != null) {
            return denied;
        }
        String role = body == null || body.get("role") == null ? "" : String.valueOf(body.get("role"));
        if (!StringUtils.hasText(role)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<String>failure(400, "role is required"));
        }
        Map<String, Object> updated = userRepository.updateRole(id, role);
        if (updated == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.<String>failure(404, "user not found"));
        }
        ApiResponse<Map<String, Object>> response = ApiResponse.success(updated);
        response.setMessage("用户角色更新成功");
        return ResponseEntity.ok(response);
    }

    private ResponseEntity<ApiResponse<String>> requireUserRoleManage(String authorization) {
        // 用户管理接口沿用旧后端权限点 user:role:manage。
        // 这样前端菜单和按钮权限不用跟着本次 Java 迁移一起调整。
        CurrentUser user = authSupport.parseBearerUser(authorization);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.<String>failure(401, "未登录或登录已过期"));
        }
        if (!authSupport.hasPermission(user, "user:role:manage")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.<String>failure(403, "Permission denied: user:role:manage is required"));
        }
        return null;
    }
}
