package com.oneflow.api.upload;

import com.oneflow.api.auth.CurrentUser;
import com.oneflow.api.common.ApiResponse;
import com.oneflow.api.config.OneFlowProperties;
import com.oneflow.api.security.AuthSupport;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/upload")
public class UploadController {

    private final OneFlowProperties properties;
    private final AuthSupport authSupport;

    public UploadController(OneFlowProperties properties, AuthSupport authSupport) {
        this.properties = properties;
        this.authSupport = authSupport;
    }

    @PostMapping
    public ResponseEntity<?> upload(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam("files") MultipartFile[] files) throws Exception {
        CurrentUser user = authSupport.parseBearerUser(authorization);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.<String>failure(401, "未登录或登录已过期"));
        }
        if (files == null || files.length == 0) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.<String>failure(400, "未收到文件"));
        }

        Path uploadDir = Paths.get(properties.getUpload().getDir()).toAbsolutePath().normalize();
        Files.createDirectories(uploadDir);
        List<String> urls = new ArrayList<String>();
        for (MultipartFile file : files) {
            if (file.isEmpty()) {
                continue;
            }
            String contentType = file.getContentType();
            if (!StringUtils.hasText(contentType) || !contentType.startsWith("image/")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.<String>failure(400, "仅支持图片文件"));
            }
            String originalName = file.getOriginalFilename() == null ? "" : file.getOriginalFilename();
            String ext = "";
            int dot = originalName.lastIndexOf('.');
            if (dot >= 0) {
                ext = originalName.substring(dot);
            }
            String filename = UUID.randomUUID().toString() + ext;
            Path target = uploadDir.resolve(filename).normalize();
            if (!target.startsWith(uploadDir)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.<String>failure(400, "invalid file name"));
            }
            file.transferTo(target.toFile());
            // 旧 Node 返回的是可直接拼接访问的 /uploads/xxx，前端已有代码按这个字段展示图片。
            urls.add("/uploads/" + filename);
        }
        return ResponseEntity.ok(ApiResponse.success(urls));
    }
}
