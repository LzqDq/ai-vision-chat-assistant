package com.visionchat.repository;

import com.visionchat.entity.ChatRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 聊天记录数据仓库
 */
@Repository
public interface ChatRecordRepository extends JpaRepository<ChatRecord, Long> {

    /**
     * 按时间正序查询指定会话的所有消息
     */
    List<ChatRecord> findBySessionIdOrderByTimestampAsc(String sessionId);

    /**
     * 获取所有不重复的会话ID，按最新活动时间倒序
     */
    @Query("SELECT DISTINCT r.sessionId FROM ChatRecord r GROUP BY r.sessionId ORDER BY MAX(r.timestamp) DESC")
    List<String> findDistinctSessionIds();

    /**
     * 删除指定会话的所有记录
     */
    void deleteBySessionId(String sessionId);

    /**
     * 统计指定会话的消息数量
     */
    long countBySessionId(String sessionId);

    /**
     * 获取指定会话的第一条用户消息（用于预览）
     */
    @Query("SELECT r FROM ChatRecord r WHERE r.sessionId = :sessionId AND r.role = 'USER' ORDER BY r.timestamp ASC LIMIT 1")
    ChatRecord findFirstUserMessageBySessionId(@Param("sessionId") String sessionId);
}
