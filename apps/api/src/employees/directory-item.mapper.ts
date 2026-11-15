import {
  annualize,
  bandMetrics,
  type FxTable,
  type IsoDate,
  Money,
} from '@paylens/domain';
import type {
  EmployeeListItem,
  EmployeePay,
  EmployeeProfile,
} from '@paylens/shared';
import { toMoneyJson } from '../common/money-json.js';
import type { DirectoryRow, ProfileRow } from './employees.repository.js';

export interface DirectoryContext {
  readonly fx: FxTable;
  readonly reportingCurrency: string;
  /** Rates are taken as of this date (the latest on or before it). */
  readonly today: IsoDate;
  /** false for viewers: the item is sent without `pay` (api.md → masked variant). */
  readonly showPay: boolean;
}

/**
 * One directory row as the API sends it. All money arithmetic is the domain's (exact,
 * half-even), so the figures match the profile and the analytics to the minor unit.
 */
export function toDirectoryItem(
  row: DirectoryRow,
  context: DirectoryContext,
): EmployeeListItem {
  const item: EmployeeListItem = {
    id: row.id,
    employeeCode: row.employeeCode,
    firstName: row.firstName,
    lastName: row.lastName,
    workEmail: row.workEmail,
    countryCode: row.countryCode,
    department: { code: row.departmentCode, name: row.departmentName },
    levelCode: row.levelCode,
    jobTitle: row.jobTitle,
    status: row.status,
    hireDate: row.hireDate,
  };
  return context.showPay ? { ...item, pay: payOf(row, context) } : item;
}

function payOf(
  row: DirectoryRow,
  context: DirectoryContext,
): EmployeePay | null {
  if (row.salary === null) {
    return null;
  }
  const salary = Money.of(row.salary.amountMinor, row.salary.currency);
  const annualLocal = annualize(salary, row.salary.frequency);
  const conversion = context.fx.convert(
    annualLocal,
    context.reportingCurrency,
    context.today,
  );
  const band =
    row.band === null
      ? null
      : {
          min: Money.of(row.band.minMinor, row.band.currency),
          mid: Money.of(row.band.midMinor, row.band.currency),
          max: Money.of(row.band.maxMinor, row.band.currency),
        };
  const metrics = band === null ? null : bandMetrics(annualLocal, band);

  return {
    salary: toMoneyJson(salary),
    frequency: row.salary.frequency,
    annualLocal: toMoneyJson(annualLocal),
    annualReporting:
      conversion.kind === 'converted'
        ? { money: toMoneyJson(conversion.money), asOf: conversion.asOf }
        : null,
    band:
      band === null
        ? null
        : {
            min: toMoneyJson(band.min),
            mid: toMoneyJson(band.mid),
            max: toMoneyJson(band.max),
          },
    compaRatio: metrics?.compaRatio ?? null,
    rangePenetration: metrics?.rangePenetration ?? null,
    bandPosition: metrics?.position ?? null,
  };
}

/** The profile: the directory item plus details; gender only for readers who see pay. */
export function toProfile(
  row: ProfileRow,
  context: DirectoryContext,
): EmployeeProfile {
  return {
    ...toDirectoryItem(row, context),
    jobFamily: { code: row.jobFamilyCode, name: row.jobFamilyName },
    employmentType: row.employmentType,
    fte: row.fte,
    terminationDate: row.terminationDate,
    manager: row.manager,
    ...(context.showPay && { gender: row.gender }),
    version: row.version,
  };
}
