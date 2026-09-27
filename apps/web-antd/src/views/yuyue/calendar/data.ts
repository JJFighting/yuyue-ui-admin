import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { YuyueCalendarApi } from '#/api/yuyue/venue-calendar';

import { h } from 'vue';

import { Switch, Tag } from 'ant-design-vue';

import { z } from '#/adapter/form';
import { getSimpleVenueList } from '#/api/yuyue/venue';

/** 日历类型：1=每周固定开放日 2=指定日期安排 */
const CALENDAR_TYPE_OPTIONS = [
  { label: '每周开放日', value: 1 },
  { label: '指定日期', value: 2 },
];

/** 星期几（1=周一 ... 7=周日） */
const WEEKDAYS = [
  '周一',
  '周二',
  '周三',
  '周四',
  '周五',
  '周六',
  '周日',
] as const;

const WEEKDAY_OPTIONS = WEEKDAYS.map((label, index) => ({
  label,
  value: index + 1,
}));

/** 星期几编号转文案；非法值原样展示 */
function formatWeekday(weekday: null | number | undefined) {
  if (!weekday) {
    return '';
  }
  return WEEKDAYS[weekday - 1] ?? String(weekday);
}

/** 关联数据：场地列表（用于场地名回显） */
let venueList: Awaited<ReturnType<typeof getSimpleVenueList>> = [];
getSimpleVenueList().then((data) => (venueList = data));

/** 新增/修改的表单 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'id',
      dependencies: {
        triggerFields: [''],
        show: () => false,
      },
    },
    {
      fieldName: 'venueId',
      label: '场地',
      component: 'ApiSelect',
      componentProps: {
        placeholder: '请选择场地',
        api: getSimpleVenueList,
        labelField: 'name',
        valueField: 'id',
        allowClear: true,
        showSearch: true,
      },
      rules: 'selectRequired',
    },
    {
      fieldName: 'type',
      label: '类型',
      component: 'RadioGroup',
      componentProps: {
        options: CALENDAR_TYPE_OPTIONS,
      },
      rules: z.number().default(1),
    },
    {
      fieldName: 'weekday',
      label: '星期几',
      component: 'Select',
      componentProps: {
        options: WEEKDAY_OPTIONS,
        placeholder: '请选择星期几',
        allowClear: true,
      },
      dependencies: {
        triggerFields: ['type'],
        if: (values) => values.type === 1,
      },
      rules: 'selectRequired',
    },
    {
      fieldName: 'calDate',
      label: '日期',
      component: 'DatePicker',
      componentProps: {
        class: 'w-full',
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
        placeholder: '请选择日期',
      },
      dependencies: {
        triggerFields: ['type'],
        if: (values) => values.type === 2,
      },
      rules: 'required',
    },
    {
      fieldName: 'open',
      label: '是否开放',
      component: 'Switch',
      componentProps: {
        checkedChildren: '开放',
        unCheckedChildren: '闭馆',
      },
      dependencies: {
        triggerFields: ['type'],
        if: (values) => values.type === 2,
      },
      rules: z.boolean().default(true),
      help: '指定日期是否开放；临时闭馆=关闭',
    },
    {
      fieldName: 'remark',
      label: '备注',
      component: 'Textarea',
      componentProps: {
        placeholder: '请输入备注',
        maxlength: 255,
      },
    },
  ];
}

/** 列表的搜索表单 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'venueId',
      label: '场地',
      component: 'ApiSelect',
      componentProps: {
        placeholder: '请选择场地',
        api: getSimpleVenueList,
        labelField: 'name',
        valueField: 'id',
        allowClear: true,
        showSearch: true,
      },
    },
  ];
}

/** 列表的字段 */
export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    {
      field: 'id',
      title: '编号',
      minWidth: 80,
    },
    {
      field: 'venueId',
      title: '场地',
      minWidth: 140,
      slots: {
        default: ({ row }) => {
          return (
            venueList.find((venue) => venue.id === row.venueId)?.name ??
            row.venueId
          );
        },
      },
    },
    {
      field: 'type',
      title: '类型',
      minWidth: 110,
      slots: {
        default: ({ row }) => {
          return h(
            Tag,
            { color: row.type === 1 ? 'blue' : 'purple' },
            () => (row.type === 1 ? '每周开放日' : '指定日期'),
          );
        },
      },
    },
    {
      field: 'weekday',
      title: '星期几',
      minWidth: 90,
      formatter: ({ cellValue }) => formatWeekday(cellValue),
    },
    {
      field: 'calDate',
      title: '日期',
      minWidth: 110,
    },
    {
      field: 'open',
      title: '是否开放',
      minWidth: 90,
      slots: {
        default: ({ row }) => {
          return h(Switch, {
            checked: row.open,
            checkedChildren: '开',
            disabled: true,
            size: 'small',
            unCheckedChildren: '关',
          });
        },
      },
    },
    {
      field: 'remark',
      title: '备注',
      minWidth: 160,
    },
    {
      field: 'createTime',
      title: '创建时间',
      minWidth: 180,
      formatter: 'formatDateTime',
    },
    {
      title: '操作',
      width: 130,
      fixed: 'right',
      slots: { default: 'actions' },
    },
  ];
}

/** 按类型归一提交值：每周规则只带 weekday（open 恒 true），指定日期只带 calDate+open */
export function normalizeCalendarValues(
  values: YuyueCalendarApi.Calendar,
): YuyueCalendarApi.Calendar {
  const type = values.type ?? 1;
  return {
    ...values,
    weekday: type === 1 ? values.weekday : null,
    calDate: type === 2 ? values.calDate : null,
    open: type === 2 ? (values.open ?? true) : true,
  };
}
