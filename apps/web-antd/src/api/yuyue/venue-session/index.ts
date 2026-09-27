import type { PageParam, PageResult } from '@vben/request';

import { requestClient } from '#/api/request';

export namespace YuyueSessionApi {
  /** 场地时段 */
  export interface Session {
    id?: number;
    venueId: number;
    name: string;
    /** HH:mm:ss */
    startTime: string;
    /** HH:mm:ss */
    endTime: string;
    quota: number;
    status: number;
  }

  /** 可预约时段（含余量） */
  export interface SessionAvailable {
    sessionId: number;
    name: string;
    startTime: string;
    endTime: string;
    capacity: number;
    used: number;
    remaining: number;
    bookable: boolean;
    /** FULL | DEADLINE_PASSED */
    reason: null | string;
  }
}

/** 查询时段分页 */
export function getSessionPage(params: PageParam & Partial<YuyueSessionApi.Session>) {
  return requestClient.get<PageResult<YuyueSessionApi.Session>>(
    '/yuyue/venue-session/page',
    {
      params,
    },
  );
}

/** 查询时段详情 */
export function getSession(id: number) {
  return requestClient.get<YuyueSessionApi.Session>(
    `/yuyue/venue-session/get?id=${id}`,
  );
}

/** 新增时段 */
export function createSession(data: YuyueSessionApi.Session) {
  return requestClient.post('/yuyue/venue-session/create', data);
}

/** 修改时段 */
export function updateSession(data: YuyueSessionApi.Session) {
  return requestClient.put('/yuyue/venue-session/update', data);
}

/** 删除时段 */
export function deleteSession(id: number) {
  return requestClient.delete(`/yuyue/venue-session/delete?id=${id}`);
}

/** 获取场地下时段精简列表 */
export function getSimpleSessionList(venueId: number) {
  return requestClient.get<YuyueSessionApi.Session[]>(
    `/yuyue/venue-session/simple-list?venueId=${venueId}`,
  );
}

/**
 * 查询指定日期的可预约时段（含余量与不可约原因）
 *
 * @param venueId 场地编号
 * @param date 日期，格式 YYYY-MM-DD
 */
export function getAvailableSessionList(venueId: number, date: string) {
  return requestClient.get<YuyueSessionApi.SessionAvailable[]>(
    `/yuyue/venue-session/available?venueId=${venueId}&date=${date}`,
  );
}
