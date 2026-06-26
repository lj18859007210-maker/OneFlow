package com.oneflow.app;

import java.sql.Connection;
import java.sql.SQLException;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * 应用启动后主动预热数据库连接池。
 *
 * Hikari 默认会在第一次真正借连接时启动连接池；如果第一个用户请求刚好需要查库，
 * 用户就会替系统承担这段初始化耗时。旧 Node 后端通常在启动/连接池初始化阶段已经
 * 吃掉这段成本，所以用户访问时感知不到。
 *
 * 这里主动借出并归还一次连接，让连接池在应用启动阶段完成初始化。
 */
@Component
public class DataSourceWarmupRunner implements ApplicationRunner {

    private static final Logger LOGGER = LoggerFactory.getLogger(DataSourceWarmupRunner.class);

    private final DataSource dataSource;

    public DataSourceWarmupRunner(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(ApplicationArguments args) {
        long startedAt = System.currentTimeMillis();
        try (Connection connection = dataSource.getConnection()) {
            // 使用 JDBC 标准 isValid，避免写死 SELECT 1 后在不同数据库方言下踩坑。
            connection.isValid(3);
            LOGGER.info("[DB] DataSource warmup completed ({}ms)", System.currentTimeMillis() - startedAt);
        } catch (SQLException ex) {
            // 迁移期保持服务可启动：健康检查、验证码等非查库接口仍可用；
            // 真正查库接口会受 Hikari 超时配置保护，不再无限等待。
            LOGGER.warn("[DB] DataSource warmup failed after {}ms: {}",
                    System.currentTimeMillis() - startedAt,
                    ex.getMessage());
        }
    }
}
