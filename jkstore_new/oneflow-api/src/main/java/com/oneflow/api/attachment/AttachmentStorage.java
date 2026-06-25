package com.oneflow.api.attachment;

import com.oneflow.api.config.OneFlowProperties;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class AttachmentStorage {

    private final OneFlowProperties properties;

    public AttachmentStorage(OneFlowProperties properties) {
        this.properties = properties;
    }

    public StoredFile store(String scope, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("file is required");
        }
        if (file.getSize() > properties.getUpload().getMaxFileSize()) {
            throw new IllegalArgumentException("file is too large");
        }
        try {
            Path baseDir = baseDir();
            Path targetDir = baseDir.resolve("attachments").resolve(scope).normalize();
            Files.createDirectories(targetDir);

            String originalName = normalizeOriginalName(file.getOriginalFilename());
            String filename = UUID.randomUUID().toString() + extension(originalName);
            Path target = targetDir.resolve(filename).normalize();
            if (!target.startsWith(targetDir)) {
                throw new IllegalArgumentException("invalid file name");
            }
            file.transferTo(target.toFile());

            // 数据库存相对路径，不存绝对路径。这样项目迁机器、迁容器时，只需要改 upload.dir。
            String storagePath = Paths.get("attachments", scope, filename).toString().replace('\\', '/');
            return new StoredFile(originalName, storagePath, file.getContentType(), file.getSize());
        } catch (IOException ex) {
            throw new IllegalStateException("failed to store file", ex);
        }
    }

    public String buildFileRoute(String kind, String id, String mode) {
        return "/api/attachments/files/" + kind + "/" + id + "?mode=" + mode;
    }

    public Path resolve(String storagePath) {
        Path base = baseDir().normalize().toAbsolutePath();
        Path resolved = base.resolve(storagePath == null ? "" : storagePath).normalize().toAbsolutePath();
        if (!resolved.startsWith(base)) {
            throw new IllegalArgumentException("invalid storage path");
        }
        return resolved;
    }

    private Path baseDir() {
        return Paths.get(properties.getUpload().getDir()).toAbsolutePath().normalize();
    }

    private String extension(String name) {
        int index = name == null ? -1 : name.lastIndexOf('.');
        if (index < 0 || index == name.length() - 1) {
            return "";
        }
        return name.substring(index);
    }

    private String normalizeOriginalName(String name) {
        String value = name == null ? "file" : Paths.get(name).getFileName().toString();
        return value.trim().isEmpty() ? "file" : value;
    }

    public static class StoredFile {
        private final String originalName;
        private final String storagePath;
        private final String mimeType;
        private final long fileSize;

        public StoredFile(String originalName, String storagePath, String mimeType, long fileSize) {
            this.originalName = originalName;
            this.storagePath = storagePath;
            this.mimeType = mimeType;
            this.fileSize = fileSize;
        }

        public String getOriginalName() {
            return originalName;
        }

        public String getStoragePath() {
            return storagePath;
        }

        public String getMimeType() {
            return mimeType;
        }

        public long getFileSize() {
            return fileSize;
        }
    }
}
