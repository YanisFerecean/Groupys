package com.groupys.service;

import com.groupys.config.PerformanceFeatureFlags;
import io.quarkus.logging.Log;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

@ApplicationScoped
public class ReadModelReconciliationJob {

    @Inject
    PerformanceFeatureFlags flags;

    @Inject
    EntityManager entityManager;

    @Scheduled(every = "{readmodel.reconcile.every:60m}", delayed = "{readmodel.reconcile.initial-delay:180s}")
    @Transactional
    void reconcile() {
        if (!flags.readModelWriteEnabled()) {
            return;
        }
        try {
            reconcilePostCounters();
            reconcileCommentCounters();
            reconcileConversationLatest();
            reconcileUnreadCounts();
        } catch (Exception e) {
            Log.debug("Read-model reconciliation job failed", e);
        }
    }

    private void reconcilePostCounters() {
        entityManager.createNativeQuery("""
                UPDATE posts p
                SET like_count = COALESCE((
                        SELECT COUNT(1) FROM post_reactions pr
                        WHERE pr.post_id = p.id AND pr.reaction_type = 'like'
                    ), 0),
                    dislike_count = COALESCE((
                        SELECT COUNT(1) FROM post_reactions pr
                        WHERE pr.post_id = p.id AND pr.reaction_type = 'dislike'
                    ), 0),
                    comment_count = COALESCE((
                        SELECT COUNT(1) FROM comments c
                        WHERE c.post_id = p.id
                    ), 0)
                """).executeUpdate();
    }

    private void reconcileCommentCounters() {
        entityManager.createNativeQuery("""
                UPDATE comments c
                SET like_count = COALESCE((
                        SELECT COUNT(1) FROM comment_reactions cr
                        WHERE cr.comment_id = c.id AND cr.reaction_type = 'like'
                    ), 0),
                    dislike_count = COALESCE((
                        SELECT COUNT(1) FROM comment_reactions cr
                        WHERE cr.comment_id = c.id AND cr.reaction_type = 'dislike'
                    ), 0),
                    reply_count = COALESCE((
                        SELECT COUNT(1) FROM comments child
                        WHERE child.parent_comment_id = c.id
                    ), 0)
                """).executeUpdate();
    }

    private void reconcileConversationLatest() {
        entityManager.createNativeQuery("""
                UPDATE conversations c
                SET last_message_at = latest.created_at,
                    last_message_preview = latest.content
                FROM (
                    SELECT DISTINCT ON (m.conversation_id) m.conversation_id, m.created_at, m.content
                    FROM messages m
                    WHERE m.is_deleted = false
                    ORDER BY m.conversation_id, m.created_at DESC
                ) latest
                WHERE c.id = latest.conversation_id
                """).executeUpdate();

        entityManager.createNativeQuery("""
                UPDATE conversations c
                SET last_message_at = NULL,
                    last_message_preview = NULL
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM messages m
                    WHERE m.conversation_id = c.id
                      AND m.is_deleted = false
                )
                """).executeUpdate();
    }

    private void reconcileUnreadCounts() {
        entityManager.createNativeQuery("""
                UPDATE conversation_participants cp
                SET unread_count = COALESCE(unread.cnt, 0)
                FROM (
                    SELECT cp2.id AS participant_id,
                           COUNT(m.id) AS cnt
                    FROM conversation_participants cp2
                    LEFT JOIN messages m
                      ON m.conversation_id = cp2.conversation_id
                     AND m.is_deleted = false
                     AND m.sender_id <> cp2.user_id
                     AND (cp2.last_read_at IS NULL OR m.created_at > cp2.last_read_at)
                    GROUP BY cp2.id
                ) unread
                WHERE cp.id = unread.participant_id
                """).executeUpdate();
    }
}
