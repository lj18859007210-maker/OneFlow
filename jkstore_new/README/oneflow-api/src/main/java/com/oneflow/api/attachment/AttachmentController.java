package com.oneflow.api.attachment;

import com.oneflow.api.auth.CurrentUser;
import com.oneflow.api.common.ApiResponse;
import com.oneflow.api.requirement.RequirementRepository;
import com.oneflow.api.security.AuthSupport;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/attachments")
public class AttachmentController {

    private final AttachmentRepository attachmentRepository;
    private final AttachmentStorage attachmentStorage;
    private final RequirementRepository requirementRepository;
    private final AuthSupport authSupport;

    public AttachmentController(
            AttachmentRepository attachmentRepository,
            AttachmentStorage attachmentStorage,
            RequirementRepository requirementRepository,
            AuthSupport authSupport) {
        this.attachmentRepository = attachmentRepository;
        this.attachmentStorage = attachmentStorage;
        this.requirementRepository = requirementRepository;
        this.authSupport = authSupport;
    }

    @GetMapping("/requirements/{requirementId}")
    public ResponseEntity<?> listByRequirement(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable String requirementId) {
        CurrentUser user = authSupport.parseBearerUser(authorization);
        ResponseEntity<ApiResponse<String>> denied = requirePermission(user, "attachment:view");
        if (denied != null) return denied;
        ResponseEntity<ApiResponse<String>> invisible = ensureRequirementVisible(user, requirementId, "查看");
        if (invisible != null) return invisible;
        return ResponseEntity.ok(ApiResponse.success(attachmentRepository.listByRequirement(requirementId, user)));
    }

    @PostMapping("/requirements/{requirementId}/upload")
    public ResponseEntity<?> uploadFormal(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable String requirementId,
            @RequestParam("file") MultipartFile file,
            @RequestParam("category") String category,
            @RequestParam(value = "remark", required = false) String remark) {
        CurrentUser user = authSupport.parseBearerUser(authorization);
        ResponseEntity<ApiResponse<String>> denied = requirePermission(user, "attachment:upload");
        if (denied != null) return denied;
        ResponseEntity<ApiResponse<String>> invisible = ensureRequirementVisible(user, requirementId, "上传附件到");
        if (invisible != null) return invisible;
        try {
            AttachmentStorage.StoredFile stored = attachmentStorage.store("formal", file);
            Map<String, Object> attachment = attachmentRepository.createFormal(requirementId, category, remark, actorId(user), stored, user);
            return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(attachment));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.<String>failure(400, ex.getMessage()));
        }
    }

    @PostMapping("/comments/upload")
    public ResponseEntity<?> uploadComment(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam("requirementId") String requirementId,
            @RequestParam("files") MultipartFile[] files) {
        CurrentUser user = authSupport.parseBearerUser(authorization);
        ResponseEntity<ApiResponse<String>> denied = requirePermission(user, "attachment:upload");
        if (denied != null) return denied;
        ResponseEntity<ApiResponse<String>> invisible = ensureRequirementVisible(user, requirementId, "操作");
        if (invisible != null) return invisible;
        if (files == null || files.length == 0) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.<String>failure(400, "files are required"));
        }
        List<AttachmentStorage.StoredFile> stored = new ArrayList<AttachmentStorage.StoredFile>();
        for (MultipartFile file : files) {
            stored.add(attachmentStorage.store("comment", file));
        }
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(attachmentRepository.createPendingCommentAttachments(requirementId, actorId(user), stored)));
    }

    @PostMapping("/{attachmentId}/versions")
    public ResponseEntity<?> addVersion(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable String attachmentId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "remark", required = false) String remark) {
        CurrentUser user = authSupport.parseBearerUser(authorization);
        ResponseEntity<ApiResponse<String>> denied = requirePermission(user, "attachment:version:manage");
        if (denied != null) return denied;
        Map<String, Object> current = attachmentRepository.getRequirementAttachment(attachmentId, user);
        if (current == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.<String>failure(404, "attachment not found"));
        }
        ResponseEntity<ApiResponse<String>> invisible = ensureRequirementVisible(user, String.valueOf(current.get("requirementId")), "上传附件版本到");
        if (invisible != null) return invisible;
        AttachmentStorage.StoredFile stored = attachmentStorage.store("formal", file);
        return ResponseEntity.ok(ApiResponse.success(attachmentRepository.addVersion(attachmentId, remark, actorId(user), stored, user)));
    }

    @PostMapping("/comments/{commentAttachmentId}/promote")
    public ResponseEntity<?> promoteCommentAttachment(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable String commentAttachmentId,
            @RequestBody Map<String, Object> body) {
        CurrentUser user = authSupport.parseBearerUser(authorization);
        ResponseEntity<ApiResponse<String>> denied = requirePermission(user, "attachment:promote");
        if (denied != null) return denied;
        String requirementId = optionalString(body, "requirementId");
        String category = optionalString(body, "category");
        if (!StringUtils.hasText(requirementId) || !StringUtils.hasText(category)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<String>failure(400, "requirementId and category are required"));
        }
        Map<String, Object> commentAttachment = attachmentRepository.getCommentAttachment(commentAttachmentId);
        if (commentAttachment == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.<String>failure(404, "comment attachment not found"));
        }
        if (!requirementId.equals(String.valueOf(commentAttachment.get("requirementId")))) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<String>failure(400, "comment attachment does not belong to requirement"));
        }
        ResponseEntity<ApiResponse<String>> invisible = ensureRequirementVisible(user, requirementId, "归档");
        if (invisible != null) return invisible;
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(attachmentRepository.promoteCommentAttachment(requirementId, commentAttachmentId, category, actorId(user), user)));
    }

    @DeleteMapping("/{attachmentId}")
    public ResponseEntity<?> remove(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable String attachmentId) {
        CurrentUser user = authSupport.parseBearerUser(authorization);
        ResponseEntity<ApiResponse<String>> denied = requirePermission(user, "attachment:delete");
        if (denied != null) return denied;
        Map<String, Object> attachment = attachmentRepository.getRequirementAttachment(attachmentId, user);
        if (attachment == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.<String>failure(404, "attachment not found"));
        }
        ResponseEntity<ApiResponse<String>> invisible = ensureRequirementVisible(user, String.valueOf(attachment.get("requirementId")), "删除");
        if (invisible != null) return invisible;
        boolean removed = attachmentRepository.deleteRequirementAttachment(attachmentId);
        if (!removed) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.<String>failure(404, "attachment not found"));
        }
        ApiResponse<String> response = ApiResponse.success(null);
        response.setMessage("attachment removed");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/files/{kind}/{id}")
    public ResponseEntity<?> file(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable String kind,
            @PathVariable String id,
            @RequestParam(value = "mode", defaultValue = "download") String mode) {
        CurrentUser user = authSupport.parseBearerUser(authorization);
        String permission = "inline".equals(mode) ? "attachment:preview" : "attachment:download";
        ResponseEntity<ApiResponse<String>> denied = requirePermission(user, permission);
        if (denied != null) return denied;

        Map<String, Object> fileRecord;
        String requirementId;
        String fileName;
        if ("version".equals(kind)) {
            fileRecord = attachmentRepository.getVersion(id);
            if (fileRecord == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.<String>failure(404, "file not found"));
            }
            requirementId = attachmentRepository.requirementIdByVersion(id);
            fileName = "attachment-v" + fileRecord.get("versionNo");
        } else if ("comment".equals(kind)) {
            fileRecord = attachmentRepository.getCommentAttachment(id);
            if (fileRecord == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.<String>failure(404, "file not found"));
            }
            requirementId = String.valueOf(fileRecord.get("requirementId"));
            fileName = String.valueOf(fileRecord.get("originalName"));
        } else {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.<String>failure(400, "invalid file kind"));
        }

        ResponseEntity<ApiResponse<String>> invisible = ensureRequirementVisible(user, requirementId, "查看");
        if (invisible != null) return invisible;

        try {
            Path path = attachmentStorage.resolve(String.valueOf(fileRecord.get("storagePath")));
            if (!Files.exists(path)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.<String>failure(404, "file not found"));
            }
            ByteArrayResource resource = new ByteArrayResource(Files.readAllBytes(path));
            String disposition = ("inline".equals(mode) ? "inline" : "attachment")
                    + "; filename*=UTF-8''" + java.net.URLEncoder.encode(fileName, "UTF-8");
            MediaType mediaType = StringUtils.hasText(String.valueOf(fileRecord.get("mimeType")))
                    ? MediaType.parseMediaType(String.valueOf(fileRecord.get("mimeType")))
                    : MediaType.APPLICATION_OCTET_STREAM;
            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .header(HttpHeaders.CONTENT_DISPOSITION, disposition)
                    .body((Resource) resource);
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.<String>failure(500, String.valueOf(ex.getMessage())));
        }
    }

    private ResponseEntity<ApiResponse<String>> ensureRequirementVisible(CurrentUser user, String requirementId, String action) {
        Map<String, Object> requirement = requirementRepository.findById(requirementId);
        if (requirement == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.<String>failure(404, "requirement not found"));
        }
        if (!requirementRepository.canView(user, requirement)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.<String>failure(403, "当前账号不能" + action + "该需求"));
        }
        return null;
    }

    private ResponseEntity<ApiResponse<String>> requirePermission(CurrentUser user, String permission) {
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

    private String actorId(CurrentUser user) {
        return user == null ? "unknown" : (StringUtils.hasText(user.getId()) ? user.getId() : user.getUsername());
    }

    private String optionalString(Map<String, Object> body, String key) {
        if (body == null || body.get(key) == null) {
            return null;
        }
        String value = String.valueOf(body.get(key)).trim();
        return value.isEmpty() ? null : value;
    }
}
