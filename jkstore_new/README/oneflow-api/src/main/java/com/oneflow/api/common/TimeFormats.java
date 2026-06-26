package com.oneflow.api.common;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public final class TimeFormats {

    private static final DateTimeFormatter UPDATE_TIME_FORMAT =
            DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm:ss");

    private TimeFormats() {
    }

    public static String currentUpdateTime() {
        return LocalDateTime.now().format(UPDATE_TIME_FORMAT);
    }
}
