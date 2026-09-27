import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { CommonStatusEnum, DICT_TYPE } from '@vben/constants';
import { getDictOptions } from '@vben/hooks';

import { z } from '#/adapter/form';
import { getSimpleVenueList } from '#/api/yuyue/venue';

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
      fieldName: 'name',
      label: '场次名称',
      component: 'Input',
      componentProps: {
        placeholder: '请输入场次名称',
        maxlength: 64,
      },
      rules: 'required',
    },
    {
      fieldName: 'startTime',
      label: '开始时间',
      component: 'TimePicker',
      componentProps: {
        class: 'w-full',
        format: 'HH:mm:ss',
        valueFormat: 'HH:mm:ss',
        placeholder: '请选择开始时间',
      },
      rules: 'required',
    },
    {
      fieldName: 'endTime',
      label: '结束时间',
      component: 'TimePicker',
      componentProps: {
        class: 'w-full',
        format: 'HH:mm:ss',
        valueFormat: 'HH:mm:ss',
        placeholder: '请选择结束时间',
      },
      dependencies: {
        triggerFields: ['startTime', 'endTime'],
        rules: (values) =>
          z
            .any()
            .refine(
              (value) => value !== null && value !== undefined && value !== '',
              '请选择结束时间',
            )
            .refine(
              (value) =>
                value === null ||
                value === undefined ||
                value === '' ||
                !values.startTime ||
                // HH:mm:ss 字符串可直接按字典序比较
                value > values.startTime,
              '结束时间必须晚于开始时间',
            ),
      },
    },
    {
      fieldName: 'quota',
      label: '场次名额',
      component: 'InputNumber',
      componentProps: {
        class: '!w-full',
        min: 0,
        precision: 0,
        placeholder: '请输入场次名额',
      },
      rules: 'required',
    },
    {
      fieldName: 'status',
      label: '场次状态',
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
    {
      fieldName: 'status',
      label: '场次状态',
      component: 'Select',
      componentProps: {
        options: getDictOptions(DICT_TYPE.COMMON_STATUS, 'number'),
        placeholder: '请选择场次状态',
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
      field: 'name',
      title: '场次名称',
      minWidth: 140,
    },
    {
      field: 'startTime',
      title: '开始时间',
      minWidth: 100,
    },
    {
      field: 'endTime',
      title: '结束时间',
      minWidth: 100,
    },
    {
      field: 'quota',
      title: '名额',
      minWidth: 80,
    },
    {
      field: 'status',
      title: '场次状态',
      minWidth: 90,
      cellRender: {
        name: 'CellDict',
        props: { type: DICT_TYPE.COMMON_STATUS },
      },
    },
    {
      title: '操作',
      width: 130,
      fixed: 'right',
      slots: { default: 'actions' },
    },
  ];
}
