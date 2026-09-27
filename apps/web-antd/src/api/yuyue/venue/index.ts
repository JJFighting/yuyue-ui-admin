import type { PageParam, PageResult } from '@vben/request';

import { requestClient } from '#/api/request';

export namespace YuyueVenueApi {
  /** 场地信息 */
  export interface Venue {
    id?: number;
    name: string;
    type?: string;
    location?: string;
    capacity: number;
    description?: string;
    /** 逗号分隔的用户编号；清空时传 null（后端 @Pattern 拒绝空串） */
    managerUserIds?: null | string;
    auditProcessKey?: null | string;
    status: number;
    /** epoch 毫秒（后端 TimestampLocalDateTimeSerializer） */
    createTime?: number;
  }
}

/** 查询场地分页 */
export function getVenuePage(params: PageParam & Partial<YuyueVenueApi.Venue>) {
  return requestClient.get<PageResult<YuyueVenueApi.Venue>>(
    '/yuyue/venue/page',
    {
      params,
    },
  );
}

/** 获取场地精简信息列表 */
export function getSimpleVenueList() {
  return requestClient.get<YuyueVenueApi.Venue[]>('/yuyue/venue/simple-list');
}

/** 查询场地详情 */
export function getVenue(id: number) {
  return requestClient.get<YuyueVenueApi.Venue>(`/yuyue/venue/get?id=${id}`);
}

/** 新增场地 */
export function createVenue(data: YuyueVenueApi.Venue) {
  return requestClient.post('/yuyue/venue/create', data);
}

/** 修改场地 */
export function updateVenue(data: YuyueVenueApi.Venue) {
  return requestClient.put('/yuyue/venue/update', data);
}

/** 删除场地 */
export function deleteVenue(id: number) {
  return requestClient.delete(`/yuyue/venue/delete?id=${id}`);
}
