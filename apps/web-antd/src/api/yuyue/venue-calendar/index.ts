import type { PageParam, PageResult } from '@vben/request';

import { requestClient } from '#/api/request';

export namespace YuyueCalendarApi {
  /** 场地开放日历 */
  export interface Calendar {
    id?: number;
    venueId: number;
    /** 1 每周规则 2 指定日期 */
    type: number;
    weekday?: null | number;
    calDate?: null | string;
    open?: boolean;
    remark?: string;
    createTime?: string;
  }
}

/** 查询开放日历分页 */
export function getCalendarPage(params: PageParam & Partial<YuyueCalendarApi.Calendar>) {
  return requestClient.get<PageResult<YuyueCalendarApi.Calendar>>(
    '/yuyue/venue-calendar/page',
    {
      params,
    },
  );
}

/** 查询开放日历详情 */
export function getCalendar(id: number) {
  return requestClient.get<YuyueCalendarApi.Calendar>(
    `/yuyue/venue-calendar/get?id=${id}`,
  );
}

/** 新增开放日历 */
export function createCalendar(data: YuyueCalendarApi.Calendar) {
  return requestClient.post('/yuyue/venue-calendar/create', data);
}

/** 修改开放日历 */
export function updateCalendar(data: YuyueCalendarApi.Calendar) {
  return requestClient.put('/yuyue/venue-calendar/update', data);
}

/** 删除开放日历 */
export function deleteCalendar(id: number) {
  return requestClient.delete(`/yuyue/venue-calendar/delete?id=${id}`);
}
