import { requestClient } from '#/api/request';

export namespace YuyueConfigApi {
  /** 表单校验问题项 */
  export interface FormCheckIssue {
    level: 'ERROR' | 'INFO' | 'WARNING';
    scope: string;
    message: string;
  }

  /** 表单校验结果 */
  export interface FormCheckResult {
    passed: boolean;
    issues: FormCheckIssue[];
  }

  /** 流程版本 */
  export interface ProcessVersion {
    processDefinitionId: string;
    version: number;
    deploymentTime: string;
    formFields: string;
    formConf: string;
    simpleModel: string;
  }

  /** 流程表单字段差异项 */
  export interface FieldDiff {
    field: string;
    change: 'ADDED' | 'REMOVED' | 'TYPE_CHANGED';
    detail: string;
  }

  /** 流程版本差异 */
  export interface ProcessVersionDiff {
    fromVersion: string;
    toVersion: string;
    fieldDiffs: FieldDiff[];
    simpleModelChanged: boolean;
    fromSimpleModel: string;
    toSimpleModel: string;
  }
}

/** 校验表单与流程模型一致性 */
export function checkForm(data: {
  formFields?: string[];
  processDefinitionKey?: string;
  simpleModel?: string;
}) {
  return requestClient.post<YuyueConfigApi.FormCheckResult>(
    '/yuyue/formcheck/check',
    data,
  );
}

/** 查询流程版本列表 */
export function getVersionList(processDefinitionKey: string) {
  return requestClient.get<YuyueConfigApi.ProcessVersion[]>(
    `/yuyue/process-version/list?processDefinitionKey=${processDefinitionKey}`,
  );
}

/** 查询两个流程版本间的差异 */
export function getVersionDiff(from: string, to: string) {
  return requestClient.get<YuyueConfigApi.ProcessVersionDiff>(
    `/yuyue/process-version/diff?from=${from}&to=${to}`,
  );
}

/** 回滚到指定流程版本 */
export function rollbackVersion(processDefinitionId: string) {
  return requestClient.put(
    `/yuyue/process-version/rollback?processDefinitionId=${processDefinitionId}`,
  );
}
