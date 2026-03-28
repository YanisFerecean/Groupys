package com.groupys.model;

import jakarta.persistence.Column;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;

import static org.junit.jupiter.api.Assertions.assertEquals;

class UserMappingTest {

    @Test
    void bioAndUrlFieldsUseTextColumns() throws NoSuchFieldException {
        assertColumnDefinition("bio", "TEXT");
        assertColumnDefinition("bannerUrl", "TEXT");
        assertColumnDefinition("profileImage", "TEXT");
    }

    private void assertColumnDefinition(String fieldName, String expectedDefinition) throws NoSuchFieldException {
        Field field = User.class.getDeclaredField(fieldName);
        Column column = field.getAnnotation(Column.class);

        assertEquals(expectedDefinition, column.columnDefinition());
    }
}
