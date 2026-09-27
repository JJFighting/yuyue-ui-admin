import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { h } from 'vue';

import { Tag } from 'ant-design-vue';

import { YuyueReservationApi } from '#/api/yuyue/reservation';
import { getSimpleVenueList } from '#/api/yuyue/venue';

const { StatusEnum } = YuyueReservationApi;

/** 预约单状态选项 */
export const STATUS_OPTIONS: { label: string; value: number }[] = [
  { label: '待审核', value: StatusEnum.PENDING },
  { label: '已确认', value: StatusEnum.CONFIRMED },
  { label: '已拒绝', value: StatusEnum.REJECTED },
  { label: '已取消', value: StatusEnum.CANCELED },
  { label: '已改期', value: StatusEnum.RESCHEDULED },
  { label: '已完成', value: StatusEnum.FINISHED },
  { label: '已过期', value: StatusEnum.EXPIRED },
  { label: '未到访', value: StatusEnum.NO_SHOW },
];

/** 状态 -> 文案 */
const STATUS_TEXT: Record<number, string> = Object.fromEntries(
  STATUS_OPTIONS.map((item) => [item.value, item.label]),
);

/** 状态文案（未知状态回退后端 statusName，再回退编号） */
export function statusText(status: number, fallback?: string) {
  return STATUS_TEXT[status] ?? fallback ?? `未知(${status})`;
}

/** 状态 -> Tag 颜色（待审橙/确认绿/拒绝红/取消灰/改期蓝/完成绿/过期灰/未到访红） */
const STATUS_COLOR: Record<number, string> = {
  [StatusEnum.CANCELED]: 'default',
  [StatusEnum.CONFIRMED]: 'success',
  [StatusEnum.EXPIRED]: 'default',
  [StatusEnum.FINISHED]: 'success',
  [StatusEnum.NO_SHOW]: 'error',
  [StatusEnum.PENDING]: 'orange',
  [StatusEnum.REJECTED]: 'error',
  [StatusEnum.RESCHEDULED]: 'processing',
};

/** 状态 Tag 颜色（未知状态回退灰） */
export function statusColor(status: number) {
  return STATUS_COLOR[status] ?? 'default';
}

/** 操作日志动作 -> 文案 */
export const ACTION_TEXT: Record<string, string> = {
  APPROVE: '审核通过',
  CANCEL: '取消',
  EXPIRE: '过期',
  REJECT: '审核拒绝',
  REMIND: '提醒',
  RESCHEDULE: '改期',
  SUBMIT: '提交',
};

/** 操作日志动作文案（未知动作回退原值） */
export function actionText(action: string) {
  return ACTION_TEXT[action] ?? action;
}

/** 不可预约原因 -> 文案 */
export function unbookableReasonText(reason: null | string) {
  return reason === 'FULL' ? '已满' : '已截止';
}

/** 列表的搜索表单 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'reservationNo',
      label: '编号',
      component: 'Input',
      componentProps: {
        placeholder: '请输入预约编号',
        allowClear: true,
      },
    },
    {
      fieldName: 'visitorName',
      label: '访客姓名',
      component: 'Input',
      componentProps: {
        placeholder: '请输入访客姓名',
        allowClear: true,
      },
    },
    {
      fieldName: 'visitorMobile',
      label: '手机号',
      component: 'Input',
      componentProps: {
        placeholder: '请输入访客手机号',
        allowClear: true,
      },
    },
    {
      fieldName: 'venueId',
      label: '场地',
      component: 'ApiSelect',
      componentProps: {
        api: getSimpleVenueList,
        labelField: 'name',
        valueField: 'id',
        placeholder: '请选择场地',
        allowClear: true,
      },
    },
    {
      fieldName: 'reserveDate',
      label: '日期',
      component: 'DatePicker',
      componentProps: {
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
        placeholder: '请选择预约日期',
        allowClear: true,
      },
    },
    {
      fieldName: 'status',
      label: '状态',
      component: 'Select',
      componentProps: {
        options: STATUS_OPTIONS,
        placeholder: '请选择预约单状态',
        allowClear: true,
      },
    },
  ];
}

/** 列表的字段 */
export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    {
      field: 'reservationNo',
      title: '编号',
      minWidth: 160,
    },
    {
      field: 'visitorName',
      title: '访客',
      minWidth: 90,
    },
    {
      field: 'visitorMobile',
      title: '联系方式',
      minWidth: 130,
    },
    {
      field: 'visitorCompany',
      title: '单位',
      minWidth: 120,
      formatter: ({ cellValue }) => cellValue || '-',
    },
    {
      field: 'venueName',
      title: '场地',
      minWidth: 120,
    },
    {
      field: 'reserveDate',
      title: '日期',
      minWidth: 110,
    },
    {
      field: 'sessionName',
      title: '场次',
      minWidth: 120,
    },
    {
      field: 'headcount',
      title: '人数',
      minWidth: 70,
    },
    {
      field: 'status',
      title: '状态',
      minWidth: 90,
      slots: {
        default: ({ row }) => {
          return h(
            Tag,
            { color: STATUS_COLOR[row.status] ?? 'default' },
            () => statusText(row.status, row.statusName),
          );
        },
      },
    },
    {
      field: 'createTime',
      title: '提交时间',
      minWidth: 180,
      formatter: 'formatDateTime',
    },
    {
      title: '操作',
      width: 200,
      fixed: 'right',
      slots: { default: 'actions' },
    },
  ];
}
