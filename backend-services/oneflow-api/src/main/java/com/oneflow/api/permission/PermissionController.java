package com.oneflow.api.permission;

import com.oneflow.api.auth.CurrentUser;
import com.oneflow.api.common.ApiResponse;
import com.oneflow.api.security.AuthSupport;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/permissions")
public class PermissionController {

    private final PermissionRepository permissionRepository;
    private final AuthSupport authSupport;

    public PermissionController(PermissionRepository permissionRepository, AuthSupport authSupport) {
        this.permissionRepository = permissionRepository;
        this.authSupport = authSupport;
    }

    @GetMapping
    public ResponseEntity<?> all(@RequestHeader(value = "Authorization", required = false) String authorization) {
        ResponseEntity<ApiResponse<String>> denied = requireManage(authorization);
        if (denied != null) {
            return denied;
        }
        return ResponseEntity.ok(ApiResponse.success(permissionRepository.findAll()));
    }

    @GetMapping("/modules")
    public ResponseEntity<?> modules(@RequestHeader(value = "Authorization", required = false) String authorization) {
        ResponseEntity<ApiResponse<String>> denied = requireManage(authorization);
        if (denied != null) {
            return denied;
        }
        return ResponseEntity.ok(ApiResponse.success(permissionRepository.findModules()));
    }

    @GetMapping("/role/{roleId}")
    public ResponseEntity<?> byRole(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable String roleId) {
        ResponseEntity<ApiResponse<String>> denied = requireManage(authorization);
        if (denied != null) {
            return denied;
        }
        return ResponseEntity.ok(ApiResponse.success(permissionRepository.findByRole(roleId)));
    }

    @PutMapping("/role/{roleId}")
    public ResponseEntity<?> assign(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable String roleId,
            @RequestBody PermissionAssignRequest request) {
        ResponseEntity<ApiResponse<String>> denied = requireManage(authorization);
        if (denied != null) {
            return denied;
        }
        permissionRepository.assign(roleId, request == null ? null : request.getPermissionIds());
        ApiResponse<String> response = ApiResponse.success(null);
        response.setMessage("权限分配成功");
        return ResponseEntity.ok(response);
    }

    private ResponseEntity<ApiResponse<String>> requireManage(String authorization) {
        // 当前阶段先在控制器内显式校验权限，逻辑清楚、便于逐个接口迁移。
        // 后续业务接口增多后，可以抽成 HandlerInterceptor 或 AOP 注解。
        CurrentUser user = authSupport.parseBearerUser(authorization);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.<String>failure(401, "未登录或登录已过期"));
        }
        if (!authSupport.hasPermission(user, "permission:manage")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.<String>failure(403, "Permission denied: permission:manage is required"));
        }
        return null;
    }

    public static class PermissionAssignRequest {
        private List<String> permissionIds;

        public List<String> getPermissionIds() {
            return permissionIds;
        }

        public void setPermissionIds(List<String> permissionIds) {
            this.permissionIds = permissionIds;
        }
    }
}
