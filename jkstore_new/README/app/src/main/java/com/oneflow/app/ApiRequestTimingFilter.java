package com.oneflow.app;

import java.io.IOException;
import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * 记录每个 API 请求的耗时。
 *
 * 这不是业务逻辑，而是迁移期的性能护栏：旧 Node 后端有访问日志，
 * 前端卡顿时可以直接从日志看出是哪个接口慢、慢了多久。
 */
@Component
public class ApiRequestTimingFilter extends OncePerRequestFilter {

    private static final Logger LOGGER = LoggerFactory.getLogger(ApiRequestTimingFilter.class);
    private static final long SLOW_REQUEST_THRESHOLD_MS = 1000L;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        return uri == null || !uri.startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        long startedAt = System.currentTimeMillis();
        try {
            filterChain.doFilter(request, response);
        } finally {
            long durationMs = System.currentTimeMillis() - startedAt;
            String marker = durationMs >= SLOW_REQUEST_THRESHOLD_MS ? " SLOW" : "";
            LOGGER.info(
                    "[API]{} {} {} -> {} ({}ms)",
                    marker,
                    request.getMethod(),
                    request.getRequestURI(),
                    response.getStatus(),
                    durationMs);
        }
    }
}
