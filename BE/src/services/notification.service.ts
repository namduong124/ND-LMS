import { Types } from 'mongoose';
import { NotificationModel, NotificationType } from '../models/notification.model';
import { UserModel } from '../models/user.model';
import { notFound } from '../utils/app-error';
import { emitToAll, emitToRole, emitToUser } from './socket.service';
import { BroadcastNotificationInput, ListNotificationsQuery } from '../validators/notification.validator';

export interface CreateNotificationParams {
  recipientId: string | Types.ObjectId;
  senderId?: string | Types.ObjectId | null;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
}

export const createNotification = async (params: CreateNotificationParams) => {
  const notification = await NotificationModel.create({
    recipientId: new Types.ObjectId(params.recipientId),
    senderId: params.senderId ? new Types.ObjectId(params.senderId) : undefined,
    title: params.title,
    message: params.message,
    type: params.type || 'GENERAL',
    link: params.link || '',
    isRead: false,
  });

  emitToUser(params.recipientId.toString(), 'notification:new', notification);
  return notification;
};

export const getUserNotifications = async (userId: string, query: ListNotificationsQuery) => {
  const userObjectId = new Types.ObjectId(userId);
  const filter: Record<string, unknown> = query.sentOnly
    ? { senderId: userObjectId }
    : { recipientId: userObjectId };

  if (query.unreadOnly && !query.sentOnly) {
    filter.isRead = false;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    NotificationModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .populate('senderId', 'displayName name email role avatarUrl')
      .populate('recipientId', 'displayName name email role avatarUrl')
      .lean(),
    NotificationModel.countDocuments(filter),
    NotificationModel.countDocuments({ recipientId: userObjectId, isRead: false }),
  ]);

  return {
    notifications,
    total,
    unreadCount,
    page: query.page,
    limit: query.limit,
    totalPages: Math.ceil(total / query.limit) || 1,
  };
};

export const markAsRead = async (notificationId: string, userId: string) => {
  const notification = await NotificationModel.findOneAndUpdate(
    { _id: new Types.ObjectId(notificationId), recipientId: new Types.ObjectId(userId) },
    { $set: { isRead: true } },
    { returnDocument: 'after' }
  );

  if (!notification) {
    throw notFound('Không tìm thấy thông báo hoặc bạn không có quyền');
  }

  return notification;
};

export const markAllAsRead = async (userId: string) => {
  const recipientObjectId = new Types.ObjectId(userId);
  const result = await NotificationModel.updateMany(
    { recipientId: recipientObjectId, isRead: false },
    { $set: { isRead: true } }
  );

  return { modifiedCount: result.modifiedCount };
};

export const deleteNotification = async (notificationId: string, userId: string) => {
  const result = await NotificationModel.findOneAndDelete({
    _id: new Types.ObjectId(notificationId),
    recipientId: new Types.ObjectId(userId),
  });

  if (!result) {
    throw notFound('Không tìm thấy thông báo hoặc bạn không có quyền');
  }

  return { message: 'Đã xóa thông báo thành công' };
};

export const broadcastNotification = async (senderId: string, input: BroadcastNotificationInput) => {
  let users: Array<{ _id: Types.ObjectId; role: string; email: string; displayName?: string }> = [];

  // 1. Target a specific user account (by ID or Email)
  if (input.targetRole === 'specific' || input.targetUserId || input.targetEmail) {
    let user = null;
    if (input.targetUserId) {
      user = await UserModel.findById(input.targetUserId).select('_id role email displayName').lean();
    } else if (input.targetEmail) {
      user = await UserModel.findOne({ email: input.targetEmail.toLowerCase().trim() })
        .select('_id role email displayName')
        .lean();
    }

    if (!user) {
      throw notFound('Không tìm thấy tài khoản người dùng đích');
    }
    users = [user as any];
  } else {
    // 2. Target by Role or All
    const userFilter: Record<string, unknown> = { isActive: { $ne: false } };
    if (input.targetRole !== 'all') {
      userFilter.role = input.targetRole;
    }
    users = (await UserModel.find(userFilter).select('_id role email displayName').lean()) as any;
  }

  if (!users || users.length === 0) {
    return { count: 0, message: 'Không tìm thấy người dùng phù hợp để gửi thông báo' };
  }

  const senderObjectId = new Types.ObjectId(senderId);
  const docs = users.map((u) => ({
    recipientId: u._id,
    senderId: senderObjectId,
    title: input.title,
    message: input.message,
    type: input.type,
    link: input.link || '',
    isRead: false,
  }));

  const inserted = await NotificationModel.insertMany(docs);

  // If specific user: deliver directly to their private user room
  if (users.length === 1 && (input.targetRole === 'specific' || input.targetUserId || input.targetEmail)) {
    const targetUser = users[0];
    const personalPayload = {
      _id: inserted[0]._id,
      title: input.title,
      message: input.message,
      type: input.type,
      link: input.link || '',
      senderId,
      createdAt: new Date().toISOString(),
    };

    emitToUser(targetUser._id.toString(), 'notification:new', personalPayload);

    return {
      count: 1,
      message: `Đã gửi thông báo thành công đến tài khoản ${targetUser.displayName ? `${targetUser.displayName} (${targetUser.email})` : targetUser.email}`,
    };
  }

  // Broadcast realtime events via Socket.io
  const broadcastPayload = {
    title: input.title,
    message: input.message,
    type: input.type,
    link: input.link || '',
    senderId,
    createdAt: new Date().toISOString(),
  };

  if (input.targetRole === 'all') {
    emitToAll('notification:broadcast', broadcastPayload);
  } else {
    emitToRole(input.targetRole, 'notification:broadcast', broadcastPayload);
  }

  // Also emit individual notification:new events so recipients get direct room alerts
  // For small to medium user bases, emitting notification:new to all or role ensures UI counter updates
  if (input.targetRole === 'all') {
    emitToAll('notification:new', broadcastPayload);
  } else {
    emitToRole(input.targetRole, 'notification:new', broadcastPayload);
  }

  return {
    count: inserted.length,
    message: `Đã phát thông báo thành công đến ${inserted.length} người dùng`,
  };
};
