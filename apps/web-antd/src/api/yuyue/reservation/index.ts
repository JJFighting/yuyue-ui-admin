import type { PageParam, PageResult } from '@vben/request';

import type { YuyueConfigApi } from '#/api/yuyue/config';

import { requestClient } from '#/api/request';

export namespace YuyueReservationApi {
  /** 预约单状态 */
  export const StatusEnum = {
    /** 待审核 */
    PENDING: 10,
    /** 已确认 */
    CONFIRMED: 20,
    /** 已拒绝 */
    REJECTED: 30,
    /** 已取消 */
    CANCELED: 31,
    /** 已改期 */
    RESCHEDULED: 32,
    /** 已完成 */
    FINISHED: 40,
    /** 已过期 */
    EXPIRED: 50,
    /** 未到访 */
    NO_SHOW: 51,
  } as const;

  /** 预约单列表项 */
  export interface Reservation {
    id: number;
    reservationNo: string;
    venueId: number;
    venueName: string;
    sessionId: number;
    sessionName: string;
    /** 预约日期，格式 YYYY-MM-DD */
    reserveDate: string;
    headcount: number;
    visitorName: string;
    visitorCompany?: string;
    visitorMobile: string;
    agentUserId?: number;
    status: number;
    statusName: string;
    purpose?: string;
    cancelReason?: string;
    /** epoch 毫秒（后端 TimestampLocalDateTimeSerializer） */
    createTime: number;
  }

  /** 预约单创建参数 */
  export interface ReservationCreateParam {
    venueId: number;
    sessionId: number;
    /** 预约日期，格式 YYYY-MM-DD */
    reserveDate: string;
    headcount: number;
    visitorName: string;
    visitorCompany?: string;
    visitorMobile: string;
    purpose?: string;
    formData?: string;
  }

  /** 预约单操作日志项 */
  export interface LogItem {
    action: string;
    fromStatus?: number;
    toStatus?: number;
    /** 操作人用户编号（后端 Long 经 Jackson 序列化为 JSON number） */
    operator?: number;
    reason?: string;
    /** epoch 毫秒（后端 TimestampLocalDateTimeSerializer） */
    createTime: number;
  }

  /** 预约单详情 */
  export interface ReservationDetail extends Reservation {
    formData?: string;
    ruleSnapshot?: string;
    voucherCode?: string;
    originalReservationId?: number;
    processInstanceId?: string;
    remindStatus?: number;
    sessionStartTime?: string;
    sessionEndTime?: string;
    logs?: LogItem[];
  }
}

/** 创建预约单 */
export function createReservation(data: YuyueReservationApi.ReservationCreateParam) {
  return requestClient.post<number>('/yuyue/reservation/create', data);
}

/** 取消预约单 */
export function cancelReservation(data: {
  force?: boolean;
  id: number;
  reason: string;
}) {
  return requestClient.put('/yuyue/reservation/cancel', data);
}

/** 改期预约单（返回新单 id） */
export function rescheduleReservation(data: {
  id: number;
  reserveDate: string;
  sessionId: number;
}) {
  return requestClient.put<number>('/yuyue/reservation/reschedule', data);
}

/** 查询预约单分页 */
export function getReservationPage(
  params: PageParam & Partial<YuyueReservationApi.Reservation>,
) {
  return requestClient.get<PageResult<YuyueReservationApi.Reservation>>(
    '/yuyue/reservation/page',
    {
      params,
    },
  );
}

/** 查询预约单详情 */
export function getReservationDetail(id: number) {
  return requestClient.get<YuyueReservationApi.ReservationDetail>(
    `/yuyue/reservation/get?id=${id}`,
  );
}

/**
 * 查询场地动态表单预览配置（未配置表单时返回 null）
 *
 * 复用 {@link YuyueConfigApi.ProcessVersion} 结构；该接口后端 simpleModel 恒为 null
 */
export function getFormPreview(venueId: number) {
  return requestClient.get<null | YuyueConfigApi.ProcessVersion>(
    `/yuyue/reservation/form-preview?venueId=${venueId}`,
  );
}
