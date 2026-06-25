package com.oneflow.app;

import com.oneflow.api.config.OneFlowProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication(scanBasePackages = {"com.oneflow.api", "com.oneflow.app"})
@EnableConfigurationProperties(OneFlowProperties.class)
public class OneFlowApplication {

    public static void main(String[] args) {
        SpringApplication.run(OneFlowApplication.class, args);
    }
}
