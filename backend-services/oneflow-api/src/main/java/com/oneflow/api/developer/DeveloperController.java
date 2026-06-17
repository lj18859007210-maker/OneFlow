package com.oneflow.api.developer;

import com.oneflow.api.auth.CurrentUser;
import com.oneflow.api.common.ApiResponse;
import com.oneflow.api.security.AuthSupport;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/developers")
public class DeveloperController {

    private final DeveloperRepository developerRepository;
    private final AuthSupport authSupport;

    public DeveloperController(DeveloperRepository developerRepository, AuthSupport authSupport) {
        this.developerRepository = developerRepository;
        this.authSupport = authSupport;
    }

    @GetMapping
    public ResponseEntity<?> all(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(value = "department", required = false) String department,
            @RequestParam(value = "status", required = false, defaultValue = "1") Integer status) {
        ResponseEntity<ApiResponse<String>> denied = requirePermission(authorization, "developer:view");
        if (denied != null) {
            return denied;
        }
        return ResponseEntity.ok(ApiResponse.success(developerRepository.findAll(department, status)));
    }

    @GetMapping("/assignable")
    public ResponseEntity<?> assignable(@RequestHeader(value = "Authorization", required = false) String authorization) {
        ResponseEntity<ApiResponse<String>> denied = requireAnyPermission(authorization, "requirement:create", "developer:view");
        if (denied != null) {
            return denied;
        }
        return ResponseEntity.ok(ApiResponse.success(developerRepository.findAssignable()));
    }

    @GetMapping("/load-stats")
    public ResponseEntity<?> loadStats(@RequestHeader(value = "Authorization", required = false) String authorization) {
        ResponseEntity<ApiResponse<String>> denied = requirePermission(authorization, "developer:view");
        if (denied != null) {
            return denied;
        }
        return ResponseEntity.ok(ApiResponse.success(developerRepository.loadStats()));
    }

    @GetMapping("/departments")
    public ResponseEntity<?> departments(@RequestHeader(value = "Authorization", required = false) String authorization) {
        ResponseEntity<ApiResponse<String>> denied = requirePermission(authorization, "developer:view");
        if (denied != null) {
            return denied;
        }
        return ResponseEntity.ok(ApiResponse.success(developerRepository.departments()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> byId(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable String id) {
        ResponseEntity<ApiResponse<String>> denied = requirePermission(authorization, "developer:view");
        if (denied != null) {
            return denied;
        }
        Map<String, Object> developer = developerRepository.findByUserId(id);
        if (developer == null || developer.get("profileId") == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.<String>failure(404, "开发人员不存在"));
        }
        return ResponseEntity.ok(ApiResponse.success(developer));
    }

    @PostMapping
    public ResponseEntity<?> create(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody Map<String, Object> body) {
        ResponseEntity<ApiResponse<String>> denied = requirePermission(authorization, "developer:create");
        if (denied != null) {
            return denied;
        }
        try {
            Map<String, Object> developer = developerRepository.create(body);
            ApiResponse<Map<String, Object>> response = ApiResponse.success(developer);
            response.setMessage("开发人员创建成功");
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<String>failure(400, ex.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable String id,
            @RequestBody Map<String, Object> body) {
        ResponseEntity<ApiResponse<String>> denied = requirePermission(authorization, "developer:update");
        if (denied != null) {
            return denied;
        }
        Map<String, Object> developer = developerRepository.update(id, body);
        if (developer == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.<String>failure(404, "开发人员不存在"));
        }
        ApiResponse<Map<String, Object>> response = ApiResponse.success(developer);
        response.setMessage("开发人员更新成功");
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> remove(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable String id) {
        ResponseEntity<ApiResponse<String>> denied = requirePermission(authorization, "developer:delete");
        if (denied != null) {
            return denied;
        }
        boolean removed = developerRepository.remove(id);
        if (!removed) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.<String>failure(404, "开发人员不存在"));
        }
        ApiResponse<String> response = ApiResponse.success(null);
        response.setMessage("开发人员删除成功");
        return ResponseEntity.ok(response);
    }

    private ResponseEntity<ApiResponse<String>> requirePermission(String authorization, String permission) {
        CurrentUser user = authSupport.parseBearerUser(authorization);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.<String>failure(401, "未登录或登录已过期"));
        }
        if (!authSupport.hasPermission(user, permission)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.<String>failure(403, "Permission denied: " + permission + " is required"));
        }
        return null;
    }

    private ResponseEntity<ApiResponse<String>> requireAnyPermission(String authorization, String first, String second) {
        CurrentUser user = authSupport.parseBearerUser(authorization);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.<String>failure(401, "未登录或登录已过期"));
        }
        if (!authSupport.hasPermission(user, first) && !authSupport.hasPermission(user, second)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.<String>failure(403, "Permission denied: one of " + first + ", " + second + " is required"));
        }
        return null;
    }
}
