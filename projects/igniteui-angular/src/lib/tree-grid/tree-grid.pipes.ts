import { Pipe, PipeTransform } from '@angular/core';
import { cloneArray } from '../core/utils';
import { DataUtil } from '../data-operations/data-util';
import { IgxTreeGridAPIService } from './tree-grid-api.service';
import { IGridBaseComponent } from '../grid-common/common/grid-interfaces';
import { GridBaseAPIService } from '../grid-common/api.service';
import { IgxTreeGridComponent } from './tree-grid.component';

export interface IHierarchicalRecord {
    data: any;
    children: IHierarchicalRecord[];
}

export interface IHierarchizedResult {
    data: IHierarchicalRecord[];
}

export interface IFlattenedRecord {
    data: any;
    hasChildren: boolean;
    indentationLevel: number;
}

/**
 *@hidden
 */
@Pipe({
    name: 'treeGridHierarchizing',
    pure: true
})
export class IgxTreeGridHierarchizingPipe implements PipeTransform {
    private gridAPI: IgxTreeGridAPIService;

    constructor(gridAPI: GridBaseAPIService<IGridBaseComponent>) {
        this.gridAPI = <IgxTreeGridAPIService>gridAPI;
    }

    public transform(collection: any[], childDataKey: string,
        id: string, pipeTrigger: number): IHierarchizedResult {
        const hirerchicalRecords = this.hierarchizeRecursive(collection, childDataKey);

        return {
            data: hirerchicalRecords
        };
    }

    private hierarchizeRecursive(collection: any[], childDataKey: string): IHierarchicalRecord[] {
        const result: IHierarchicalRecord[] = [];

        for (let i = 0; i < collection.length; i++) {
            const item = collection[i];
            result.push({
                data: item,
                children: item[childDataKey] ? this.hierarchizeRecursive(item[childDataKey], childDataKey) : null
            });
        }

        return result;
    }
}

/**
 *@hidden
 */
@Pipe({
    name: 'treeGridFlattening',
    pure: true
})
export class IgxTreeGridFlatteningPipe implements PipeTransform {
    private gridAPI: IgxTreeGridAPIService;

    constructor(gridAPI: GridBaseAPIService<IGridBaseComponent>) {
        this.gridAPI = <IgxTreeGridAPIService>gridAPI;
    }

    public transform(collection: IHierarchizedResult, id: string,
        expandedLevels: number, expandedStates: Map<any, boolean>, pipeTrigger: number): any[] {

        const grid: IgxTreeGridComponent = this.gridAPI.get(id);
        const primaryKey = grid.primaryKey;
        const data: IFlattenedRecord[] = [];

        this.getFlatDataRecusrive(collection.data, data, expandedLevels, expandedStates, id, 0);

        return data;
    }

    private getFlatDataRecusrive(collection: IHierarchicalRecord[], data: IFlattenedRecord[] = [],
        expandedLevels: number, expandedStates: Map<any, boolean>, gridID: string, indentationLevel: number) {
        if (!collection || !collection.length) {
            return;
        }

        for (let i = 0; i < collection.length; i++) {
            const hirarchicalRecord = collection[i];
            const flatRecord: IFlattenedRecord = {
                data: hirarchicalRecord.data,
                indentationLevel: indentationLevel,
                hasChildren: hirarchicalRecord.children && hirarchicalRecord.children.length > 0
            };
            data.push(flatRecord);

            const isExpanded = this.gridAPI.get_row_expansion_state(gridID, flatRecord);

            if (isExpanded) {
                this.getFlatDataRecusrive(hirarchicalRecord.children, data, expandedLevels,
                    expandedStates, gridID, indentationLevel + 1);
            }
        }
    }
}
