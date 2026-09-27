import type { PageParam, PageResult } from '@vben/request';

import { requestClient } from '#/api/request';

export namespace YuyueRuleApi {
  /** 场地预约规则 */
  export interface Rule {
    venueId: number;
    maxAdvanceDays?: null | number;
    reserveDeadlineHours?: null | number;
    cancelDeadlineHours?: null | number;
    rescheduleDeadlineHours?: null | number;
    rescheduleReaudit?: boolean;
    remindAdvanceHours?: null | number;
  }

  /** 规则变更日志 */
  export interface RuleChangeLog {
    id: number;
    venueId: number;
    configType: string;
    configId: number;
    beforeContent: string;
    afterContent: string;
    createTime: string;
  }
}

/** 保存场地预约规则（新增或更新） */
export function saveRule(data: YuyueRuleApi.Rule) {
  return requestClient.put('/yuyue/venue-rule/save', data);
}

/** 查询场地预约规则 */
export function getRule(venueId: number) {
  return requestClient.get<YuyueRuleApi.Rule>(
    `/yuyue/venue-rule/get?venueId=${venueId}`,
  );
}

/** 查询规则变更日志分页 */
export function getRuleChangeLogPage(
  params: PageParam & {
    configType?: string;
    venueId?: number;
  },
) {
  return requestClient.get<PageResult<YuyueRuleApi.RuleChangeLog>>(
    '/yuyue/venue-rule/change-log/page',
    {
      params,
    },
  );
}
