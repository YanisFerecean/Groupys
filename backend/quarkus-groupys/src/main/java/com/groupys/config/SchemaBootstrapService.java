package com.groupys.config;

import com.groupys.service.PgVectorSupport;
import io.quarkus.logging.Log;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

@ApplicationScoped
public class SchemaBootstrapService {

    @Inject
    DataSource dataSource;

    @Inject
    PerformanceFeatureFlags flags;

    @Inject
    PgVectorSupport pgVectorSupport;

    void onStart(@Observes StartupEvent ignored) {
        if (!flags.schemaBootstrapEnabled()) {
            return;
        }

        try (Connection connection = dataSource.getConnection();
             Statement statement = connection.createStatement()) {

            // Music snapshot split
            run(statement, "ALTER TABLE music_source_snapshot ADD COLUMN IF NOT EXISTS object_key text");
            run(statement, "ALTER TABLE music_source_snapshot ADD COLUMN IF NOT EXISTS payload_size_bytes bigint");
            run(statement, "ALTER TABLE music_source_snapshot ADD COLUMN IF NOT EXISTS checksum varchar(64)");

            // Hot takes
            run(statement, """
                    CREATE TABLE IF NOT EXISTS hot_takes (
                        id uuid PRIMARY KEY,
                        question text NOT NULL,
                        week_label varchar(20) NOT NULL,
                        created_at timestamptz NOT NULL
                    )""");
            run(statement, """
                    CREATE TABLE IF NOT EXISTS hot_take_answers (
                        id uuid PRIMARY KEY,
                        hot_take_id uuid NOT NULL REFERENCES hot_takes(id) ON DELETE CASCADE,
                        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        answer text NOT NULL,
                        image_url text,
                        music_type varchar(20),
                        answered_at timestamptz NOT NULL,
                        UNIQUE (hot_take_id, user_id)
                    )""");

            run(statement, "ALTER TABLE hot_takes ADD COLUMN IF NOT EXISTS answer_type VARCHAR(20)");
            run(statement, "UPDATE hot_takes SET answer_type = 'ARTIST' WHERE answer_type IS NULL");
            run(statement, "ALTER TABLE hot_takes ALTER COLUMN answer_type SET NOT NULL");
            run(statement, "ALTER TABLE hot_takes ALTER COLUMN answer_type SET DEFAULT 'ARTIST'");
            run(statement, "ALTER TABLE hot_take_answers ADD COLUMN IF NOT EXISTS show_on_widget BOOLEAN");
            run(statement, "UPDATE hot_take_answers SET show_on_widget = FALSE WHERE show_on_widget IS NULL");
            run(statement, "ALTER TABLE hot_take_answers ALTER COLUMN show_on_widget SET NOT NULL");
            run(statement, "ALTER TABLE hot_take_answers ALTER COLUMN show_on_widget SET DEFAULT FALSE");
            run(statement, "ALTER TABLE hot_takes ADD COLUMN IF NOT EXISTS answer_count INT NOT NULL DEFAULT 1");
            run(statement, "ALTER TABLE hot_take_answers ALTER COLUMN music_type TYPE TEXT");

            // Chat/feed read-model columns
            run(statement, "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_at timestamptz");
            run(statement, "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_preview text");
            run(statement, "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS match_id uuid REFERENCES user_matches(id) ON DELETE SET NULL");
            run(statement, "CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at_desc ON conversations (last_message_at DESC)");

            run(statement, "ALTER TABLE posts ADD COLUMN IF NOT EXISTS title text");
            run(statement, "ALTER TABLE posts ADD COLUMN IF NOT EXISTS like_count bigint NOT NULL DEFAULT 0");
            run(statement, "ALTER TABLE posts ADD COLUMN IF NOT EXISTS dislike_count bigint NOT NULL DEFAULT 0");
            run(statement, "ALTER TABLE posts ADD COLUMN IF NOT EXISTS comment_count bigint NOT NULL DEFAULT 0");

            run(statement, "ALTER TABLE comments ADD COLUMN IF NOT EXISTS like_count bigint NOT NULL DEFAULT 0");
            run(statement, "ALTER TABLE comments ADD COLUMN IF NOT EXISTS dislike_count bigint NOT NULL DEFAULT 0");
            run(statement, "ALTER TABLE comments ADD COLUMN IF NOT EXISTS reply_count bigint NOT NULL DEFAULT 0");

            run(statement, "ALTER TABLE conversation_participants ADD COLUMN IF NOT EXISTS unread_count integer NOT NULL DEFAULT 0");

            // Embedding metadata columns can exist even when vector extension is unavailable.
            run(statement, "ALTER TABLE user_taste_profile ADD COLUMN IF NOT EXISTS embedding_status varchar(32) NOT NULL DEFAULT 'NONE'");
            run(statement, "ALTER TABLE user_taste_profile ADD COLUMN IF NOT EXISTS embedding_model varchar(64)");
            run(statement, "ALTER TABLE user_taste_profile ADD COLUMN IF NOT EXISTS embedding_updated_at timestamptz");
            run(statement, "ALTER TABLE community_taste_profile ADD COLUMN IF NOT EXISTS embedding_status varchar(32) NOT NULL DEFAULT 'NONE'");
            run(statement, "ALTER TABLE community_taste_profile ADD COLUMN IF NOT EXISTS embedding_model varchar(64)");
            run(statement, "ALTER TABLE community_taste_profile ADD COLUMN IF NOT EXISTS embedding_updated_at timestamptz");

            boolean vectorAvailable = ensureVectorExtension(connection, statement);
            pgVectorSupport.setAvailable(vectorAvailable);
            if (vectorAvailable) {
                run(statement, "ALTER TABLE user_taste_profile ADD COLUMN IF NOT EXISTS taste_embedding vector(768)");
                run(statement, "ALTER TABLE community_taste_profile ADD COLUMN IF NOT EXISTS taste_embedding vector(768)");
                run(statement, "CREATE INDEX IF NOT EXISTS idx_user_taste_profile_embedding_hnsw " +
                        "ON user_taste_profile USING hnsw (taste_embedding vector_cosine_ops)");
                run(statement, "CREATE INDEX IF NOT EXISTS idx_community_taste_profile_embedding_hnsw " +
                        "ON community_taste_profile USING hnsw (taste_embedding vector_cosine_ops)");
            }
        } catch (Exception e) {
            Log.warn("Schema bootstrap failed; continuing with existing schema", e);
        }
    }

    private boolean ensureVectorExtension(Connection connection, Statement statement) {
        if (!flags.vectorBootstrapEnabled()) {
            return hasVectorExtension(connection);
        }
        if (hasVectorExtension(connection)) {
            return true;
        }
        if (!isVectorExtensionInstallable(connection)) {
            Log.info("pgvector extension is not available on this PostgreSQL server; vector features will stay disabled");
            return false;
        }
        try {
            statement.execute("CREATE EXTENSION IF NOT EXISTS vector");
            return hasVectorExtension(connection);
        } catch (Exception e) {
            // Typical cases: missing DB privileges or managed Postgres restrictions.
            Log.warnf("Unable to enable pgvector extension (%s); vector features will stay disabled", e.getMessage());
            return false;
        }
    }

    private boolean isVectorExtensionInstallable(Connection connection) {
        try (Statement statement = connection.createStatement();
             ResultSet rs = statement.executeQuery("SELECT EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector')")) {
            return rs.next() && rs.getBoolean(1);
        } catch (SQLException e) {
            Log.debug("Unable to inspect pg_available_extensions for vector", e);
            return false;
        }
    }

    private boolean hasVectorExtension(Connection connection) {
        try (Statement statement = connection.createStatement();
             ResultSet rs = statement.executeQuery("SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector')")) {
            if (rs.next()) {
                return rs.getBoolean(1);
            }
            return false;
        } catch (SQLException e) {
            Log.debug("Unable to detect pgvector extension", e);
            return false;
        }
    }

    private void run(Statement statement, String sql) {
        try {
            statement.execute(sql);
        } catch (SQLException e) {
            Log.warnf(e, "Schema bootstrap statement failed: %s", sql);
        }
    }
}
