import {
    IgxFilteringOperand,
    IgxBooleanFilteringOperand,
    IgxDateFilteringOperand,
    IgxNumberFilteringOperand,
    IgxStringFilteringOperand
} from './filtering-condition';
import { FilteringLogic, IFilteringExpression } from './filtering-expression.interface';
import { filteringStateDefaults, IFilteringState } from './filtering-state.interface';
import { FilteringStrategy, IFilteringStrategy } from './filtering-strategy';

import { ISortingExpression, SortingDirection } from './sorting-expression.interface';
import { ISortingState, SortingStateDefaults } from './sorting-state.interface';
import { ISortingStrategy, SortingStrategy } from './sorting-strategy';

import { IPagingState, PagingError } from './paging-state.interface';

import { IDataState } from './data-state.interface';
import { IGroupByExpandState, IGroupByKey } from './groupby-expand-state.interface';
import { IGroupByRecord } from './groupby-record.interface';
import { IGroupingState } from './groupby-state.interface';

export enum DataType {
    String = 'string',
    Number = 'number',
    Boolean = 'boolean',
    Date = 'date'
}

export class DataUtil {
    public static mergeDefaultProperties(target: object, defaults: object) {
        if (!defaults) {
            return target;
        }
        if (!target) {
            target = Object.assign({}, defaults);
            return target;
        }
        Object
            .keys(defaults)
            .forEach((key) => {
                if (target[key] === undefined && defaults[key] !== undefined) {
                    target[key] = defaults[key];
                }
            });
        return target;
    }
    public static sort<T>(data: T[], state: ISortingState): T[] {
        // set defaults
        DataUtil.mergeDefaultProperties(state, SortingStateDefaults);
        // apply default settings for each sorting expression(if not set)
        return state.strategy.sort(data, state.expressions);
    }
    public static group<T>(data: T[], state: IGroupingState): T[] {
        // set defaults
        DataUtil.mergeDefaultProperties(state, SortingStateDefaults);
        // apply default settings for each grouping expression(if not set)
        return state.strategy.groupBy(data, state.expressions);
    }
    public static restoreGroups<T>(data: T[], state: IGroupingState, groupsRecords: any[] = []): T[] {
        DataUtil.mergeDefaultProperties(state, SortingStateDefaults);
        if (state.expressions.length === 0) {
            return data;
        }
        return this.restoreGroupsRecursive(data, 1, state.expressions.length, state.expansion, state.defaultExpanded, groupsRecords);
    }
    private static restoreGroupsRecursive(
        data: any[], level: number, depth: number,
        expansion: IGroupByExpandState[], defaultExpanded: boolean, groupsRecords): any[] {
        let i = 0;
        let j: number;
        let result = [];
        // empty the array without changing reference
        groupsRecords.splice(0, groupsRecords.length);
        if (level !== depth) {
            data = this.restoreGroupsRecursive(data, level + 1, depth, expansion, defaultExpanded, groupsRecords);
        }
        while (i < data.length) {
            const g = data[i]['__groupParent'];
            for (j = i + 1; j < data.length; j++) {
                const h = data[j]['__groupParent'];
                if (g !== h && g.level === h.level) {
                    break;
                }
            }
            const hierarchy = this.getHierarchy(g);
            const expandState: IGroupByExpandState = expansion.find((state) =>
                this.isHierarchyMatch(state.hierarchy || [{ fieldName: g.expression.fieldName, value: g.value }], hierarchy));
            const expanded = expandState ? expandState.expanded : defaultExpanded;
            result.push(g);
            groupsRecords.push(g);

            g['groups'] = data.slice(i, j).filter((e) =>
                e.records && e.records.length && e.level === g.level + 1);
            let gr;
            while (groupsRecords.length) {
                if (groupsRecords[0].level + 1 > level) {
                    gr = groupsRecords.shift();
                } else {
                    break;
                }
            }
            if (expanded) {
                result = result.concat(data.slice(i, j));
            }
            i = j;
        }
        return result;
    }
    public static page<T>(data: T[], state: IPagingState): T[] {
        if (!state) {
            return data;
        }
        const len = data.length;
        const index = state.index;
        const res = [];
        const recordsPerPage = state.recordsPerPage;
        state.metadata = {
            countPages: 0,
            countRecords: data.length,
            error: PagingError.None
        };
        if (index < 0 || isNaN(index)) {
            state.metadata.error = PagingError.IncorrectPageIndex;
            return res;
        }
        if (recordsPerPage <= 0 || isNaN(recordsPerPage)) {
            state.metadata.error = PagingError.IncorrectRecordsPerPage;
            return res;
        }
        state.metadata.countPages = Math.ceil(len / recordsPerPage);
        if (!len) {
            return data;
        }
        if (index >= state.metadata.countPages) {
            state.metadata.error = PagingError.IncorrectPageIndex;
            return res;
        }
        return data.slice(index * recordsPerPage, (index + 1) * recordsPerPage);
    }
    public static filter<T>(data: T[], state: IFilteringState): T[] {
        // set defaults
        DataUtil.mergeDefaultProperties(state, filteringStateDefaults);
        if (!state.strategy) {
            return data;
        }
        return state.strategy.filter(data, state.expressionsTree);
    }
    public static process<T>(data: T[], state: IDataState): T[] {
        if (!state) {
            return data;
        }
        if (state.filtering) {
            data = DataUtil.filter(data, state.filtering);
        }
        if (state.sorting) {
            data = DataUtil.sort(data, state.sorting);
        }
        if (state.paging) {
            data = DataUtil.page(data, state.paging);
        }
        return data;
    }

    public static getHierarchy(gRow: IGroupByRecord): Array<IGroupByKey> {
        const hierarchy: Array<IGroupByKey> = [];
        hierarchy.push({ fieldName: gRow.expression.fieldName, value: gRow.value });
        while (gRow.__groupParent) {
            gRow = gRow.__groupParent;
            hierarchy.unshift({ fieldName: gRow.expression.fieldName, value: gRow.value });
        }
        return hierarchy;
    }

    public static isHierarchyMatch(h1: Array<IGroupByKey>, h2: Array<IGroupByKey>): boolean {
        if (h1.length !== h2.length) {
            return false;
        }
        return h1.every((level, index): boolean => {
            return level.fieldName === h2[index].fieldName && level.value === h2[index].value;
        });
    }
}
