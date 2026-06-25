package com.oneflow.api.workflow;

import com.oneflow.api.auth.CurrentUser;
import com.oneflow.api.common.ApiResponse;
import com.oneflow.api.security.AuthSupport;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workflows")
public class WorkflowController {

    private static final String REQUIREMENT_FLOW_KEY = "requirement";

    private final WorkflowRepository workflowRepository;
    private final AuthSupport authSupport;

    public WorkflowController(WorkflowRepository workflowRepository, AuthSupport authSupport) {
        this.workflowRepository = workflowRepository;
        this.authSupport = authSupport;
    }

    @GetMapping("/requirement/statuses")
    public ResponseEntity<?> getRequirementStatuses(
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        CurrentUser user = authSupport.parseBearerUser(authorization);
        ResponseEntity<ApiResponse<String>> denied = requirePermission(user, "requirement:view");
        if (denied != null) return denied;
        return ResponseEntity.ok(ApiResponse.success(workflowRepository.findStatuses(REQUIREMENT_FLOW_KEY)));
    }

    @GetMapping("/requirement/transitions")
    public ResponseEntity<?> getRequirementTransitions(
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        CurrentUser user = authSupport.parseBearerUser(authorization);
        ResponseEntity<ApiResponse<String>> denied = requirePermission(user, "requirement:view");
        if (denied != null) return denied;
        return ResponseEntity.ok(ApiResponse.success(workflowRepository.findTransitions(REQUIREMENT_FLOW_KEY)));
    }

    @PutMapping("/requirement/statuses")
    public ResponseEntity<?> updateRequirementStatuses(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody Map<String, List<Map<String, Object>>> body) {
        CurrentUser user = authSupport.parseBearerUser(authorization);
        ResponseEntity<ApiResponse<String>> denied = requirePermission(user, "workflow:manage");
        if (denied != null) return denied;
        if (body == null || body.get("statuses") == null) {
            return ResponseEntity.badRequest().body(ApiResponse.<String>failure(400, "缺少 statuses 参数"));
        }

        ApiResponse<List<Map<String, Object>>> response = ApiResponse.success(
                workflowRepository.replaceStatuses(REQUIREMENT_FLOW_KEY, body.get("statuses")));
        response.setMessage("状态配置更新成功");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/requirement/transitions")
    public ResponseEntity<?> createRequirementTransition(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody(required = false) Map<String, Object> body) {
        CurrentUser user = authSupport.parseBearerUser(authorization);
        ResponseEntity<ApiResponse<String>> denied = requirePermission(user, "workflow:manage");
        if (denied != null) return denied;
        try {
            ApiResponse<Map<String, Object>> response = ApiResponse.success(
                    workflowRepository.createTransition(REQUIREMENT_FLOW_KEY, body));
            response.setMessage("流转配置创建成功");
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ApiResponse.<String>failure(400, ex.getMessage()));
        }
    }

    @PutMapping("/requirement/transitions/{id}")
    public ResponseEntity<?> updateRequirementTransition(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable String id,
            @RequestBody(required = false) Map<String, Object> body) {
        CurrentUser user = authSupport.parseBearerUser(authorization);
        ResponseEntity<ApiResponse<String>> denied = requirePermission(user, "workflow:manage");
        if (denied != null) return denied;
        try {
            Map<String, Object> transition = workflowRepository.updateTransition(id, body);
            if (transition == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.<String>failure(404, "流转配置不存在"));
            }
            ApiResponse<Map<String, Object>> response = ApiResponse.success(transition);
            response.setMessage("流转配置更新成功");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ApiResponse.<String>failure(400, ex.getMessage()));
        }
    }

    @PostMapping("/requirement/reload")
    public ResponseEntity<?> reloadRequirementWorkflow(
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        CurrentUser user = authSupport.parseBearerUser(authorization);
        ResponseEntity<ApiResponse<String>> denied = requirePermission(user, "workflow:manage");
        if (denied != null) return denied;

        // 旧 Node 版本这里刷新内存缓存；当前 Spring Boot 迁移版先保持无状态读取，返回配置数量用于前端确认刷新结果。
        ApiResponse<Map<String, Integer>> response = ApiResponse.success(workflowRepository.reload(REQUIREMENT_FLOW_KEY));
        response.setMessage("流程配置已刷新");
        return ResponseEntity.ok(response);
    }

    private ResponseEntity<ApiResponse<String>> requirePermission(CurrentUser user, String permissionCode) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.<String>failure(401, "未登录或登录已过期"));
        }
        if (!authSupport.hasPermission(user, permissionCode)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.<String>failure(403, "Permission denied: " + permissionCode + " is required"));
        }
        return null;
    }
}
