package com.oneflow.app;

import com.oneflow.api.config.OneFlowProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;

@SpringBootApplication(scanBasePackages = {"com.oneflow.api", "com.oneflow.app"})
@EnableConfigurationProperties(OneFlowProperties.class)
public class OneFlowApplication extends SpringBootServletInitializer {

    @Override
    protected SpringApplicationBuilder configure(SpringApplicationBuilder builder) {
        return builder.sources(OneFlowApplication.class);
    }

    public static void main(String[] args) {
        SpringApplication.run(OneFlowApplication.class, args);
    }
}
