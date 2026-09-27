import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { YuyueVenueApi } from '#/api/yuyue/venue';

import { h } from 'vue';

import { CommonStatusEnum, DICT_TYPE } from '@vben/constants';
import { getDictOptions } from '@vben/hooks';

import { Tag } from 'ant-design-vue';

import { z } from '#/adapter/form';
import { getSimpleUserList } from '#/api/system/user';

/** 场地类型字典 */
const VENUE_TYPE = 'yuyue_venue_type';

/** 关联数据：用户列表（用于管理员昵称回显） */
let userList: Awaited<ReturnType<typeof getSimpleUserList>> = [];
getSimpleUserList().then((data) => (userList = data));

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
      component: 'Input',
      fieldName: 'name',
      label: '场地名称',
      componentProps: {
        placeholder: '请输入场地名称',
        maxlength: 64,
      },
      rules: 'required',
    },
    {
      fieldName: 'type',
      label: '场地类型',
      component: 'Select',
      componentProps: {
        options: getDictOptions(VENUE_TYPE),
        placeholder: '请选择场地类型',
        allowClear: true,
      },
    },
    {
      fieldName: 'location',
      label: '位置',
      component: 'Input',
      componentProps: {
        placeholder: '请输入位置',
        maxlength: 255,
      },
    },
    {
      fieldName: 'capacity',
      label: '容纳人数',
      component: 'InputNumber',
      componentProps: {
        class: '!w-full',
        min: 0,
        precision: 0,
        placeholder: '请输入容纳人数',
      },
      rules: 'required',
    },
    {
      fieldName: 'description',
      label: '场地说明',
      component: 'Textarea',
      componentProps: {
        placeholder: '请输入场地说明',
        maxlength: 512,
        showCount: true,
      },
    },
    {
      fieldName: 'managerUserIds',
      label: '管理员',
      component: 'ApiSelect',
      componentProps: {
        placeholder: '请选择场地管理员',
        api: getSimpleUserList,
        labelField: 'nickname',
        valueField: 'id',
        mode: 'tags',
        allowClear: true,
      },
      rules: z.array(z.number()).default([]),
      help: '有审核流程时，可负责审核该场地的预约',
    },
    {
      fieldName: 'auditProcessKey',
      label: '审核流程 Key',
      component: 'Input',
      componentProps: {
        placeholder: '留空=免审核',
        maxlength: 64,
      },
    },
    {
      fieldName: 'status',
      label: '场地状态',
      component: 'RadioGroup',
      componentProps: {
        options: getDictOptions(DICT_TYPE.COMMON_STATUS, 'number'),
        buttonStyle: 'solid',
        optionType: 'button',
      },
      rules: z.number().default(CommonStatusEnum.ENABLE),
    },
  ];
}

/** 规则配置的表单（全部可选，数字留空=对应语义见 help） */
export function useRuleFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'maxAdvanceDays',
      label: '最多提前预约',
      component: 'InputNumber',
      componentProps: {
        class: '!w-full',
        min: 0,
        precision: 0,
        placeholder: '不限',
        addonAfter: '天',
      },
      help: '可预约场次日期距今天的最大天数；留空表示不限',
    },
    {
      fieldName: 'reserveDeadlineHours',
      label: '预约截止',
      component: 'InputNumber',
      componentProps: {
        class: '!w-full',
        min: 0,
        precision: 0,
        placeholder: '不限',
        addonAfter: '小时',
      },
      help: '场次开始前 N 小时停止预约；留空表示不限',
    },
    {
      fieldName: 'cancelDeadlineHours',
      label: '取消截止',
      component: 'InputNumber',
      componentProps: {
        class: '!w-full',
        min: 0,
        precision: 0,
        placeholder: '不限',
        addonAfter: '小时',
      },
      help: '场次开始前 N 小时截止取消；留空表示不限',
    },
    {
      fieldName: 'rescheduleDeadlineHours',
      label: '改期截止',
      component: 'InputNumber',
      componentProps: {
        class: '!w-full',
        min: 0,
        precision: 0,
        placeholder: '不允许改期',
        addonAfter: '小时',
      },
      help: '场次开始前 N 小时截止改期；留空表示不允许改期',
    },
    {
      fieldName: 'rescheduleReaudit',
      label: '改期后重新审核',
      component: 'Switch',
      componentProps: {
        checkedChildren: '开',
        unCheckedChildren: '关',
      },
      rules: z.boolean().default(false),
      help: '开启后，已确认的预约改期时需重新走审核流程',
    },
    {
      fieldName: 'remindAdvanceHours',
      label: '到访提醒提前',
      component: 'InputNumber',
      componentProps: {
        class: '!w-full',
        min: 0,
        precision: 0,
        placeholder: '不提醒',
        addonAfter: '小时',
      },
      help: '场次开始前 N 小时发送到访提醒；留空表示不提醒',
    },
  ];
}

/** 列表的搜索表单 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'name',
      label: '场地名称',
      component: 'Input',
      componentProps: {
        placeholder: '请输入场地名称',
        allowClear: true,
      },
    },
    {
      fieldName: 'type',
      label: '场地类型',
      component: 'Select',
      componentProps: {
        options: getDictOptions(VENUE_TYPE),
        placeholder: '请选择场地类型',
        allowClear: true,
      },
    },
    {
      fieldName: 'status',
      label: '场地状态',
      component: 'Select',
      componentProps: {
        options: getDictOptions(DICT_TYPE.COMMON_STATUS, 'number'),
        placeholder: '请选择场地状态',
        allowClear: true,
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
      field: 'name',
      title: '场地名称',
      minWidth: 160,
    },
    {
      field: 'type',
      title: '场地类型',
      minWidth: 100,
      cellRender: {
        name: 'CellDict',
        props: { type: VENUE_TYPE },
      },
    },
    {
      field: 'location',
      title: '位置',
      minWidth: 140,
    },
    {
      field: 'capacity',
      title: '容纳人数',
      minWidth: 90,
    },
    {
      field: 'managerUserIds',
      title: '管理员',
      minWidth: 180,
      slots: {
        default: ({ row }) => {
          const managerIds = row.managerUserIds
            ? row.managerUserIds
                .split(',')
                .filter((id: string) => id.trim() !== '')
                .map(Number)
            : [];
          return managerIds.map((userId: number) =>
            h(
              Tag,
              { color: 'blue', class: 'mr-1' },
              () => userList.find((user) => user.id === userId)?.nickname ?? userId,
            ),
          );
        },
      },
    },
    {
      field: 'auditProcessKey',
      title: '审核流程',
      minWidth: 120,
      formatter: ({ cellValue }) => (cellValue ? String(cellValue) : '免审核'),
    },
    {
      field: 'status',
      title: '场地状态',
      minWidth: 90,
      cellRender: {
        name: 'CellDict',
        props: { type: DICT_TYPE.COMMON_STATUS },
      },
    },
    {
      field: 'createTime',
      title: '创建时间',
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

/** 管理员多选值（number[]）转提交值：逗号分隔串；清空传 null（后端 @Pattern 拒绝空串） */
export function formatManagerUserIds(ids: null | number[] | undefined) {
  return ids && ids.length > 0 ? ids.join(',') : null;
}

/** 提交值转管理员多选值（number[]） */
export function parseManagerUserIds(
  managerUserIds: null | string | undefined,
): number[] {
  return managerUserIds
    ? managerUserIds
        .split(',')
        .filter((id) => id.trim() !== '')
        .map(Number)
    : [];
}

/** 表单内部值（managerUserIds 为多选数组形态） */
export type VenueFormValues = Omit<YuyueVenueApi.Venue, 'managerUserIds'> & {
  managerUserIds?: number[];
};
