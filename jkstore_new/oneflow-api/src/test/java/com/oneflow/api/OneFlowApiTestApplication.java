package com.oneflow.api;

import com.oneflow.api.config.OneFlowProperties;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

/**
 * oneflow-api 模块的测试启动配置。
 * 模块独立测试时 @SpringBootTest 会扫描到此配置类。
 */
@SpringBootApplication
@EnableConfigurationProperties(OneFlowProperties.class)
public class OneFlowApiTestApplication {
}
