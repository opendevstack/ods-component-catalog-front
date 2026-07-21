export type AccessRuleData = {
  requiredOwners?: boolean;
  requiredGroups?: string[];
};

export const CATALOG_ACTIVITY_ACCESS_RULE: AccessRuleData = {
  requiredOwners: true,
  requiredGroups: []
};

export function hasAccessForRule(
  rule: AccessRuleData,
  userGroups: string[] | null | undefined,
  owners: string[] | null | undefined
): boolean {
  const requiredOwners = rule.requiredOwners === true;
  const requiredGroups: string[] = Array.isArray(rule.requiredGroups) ? rule.requiredGroups : [];

  const hasOwnerAccess =
    requiredOwners &&
    Array.isArray(userGroups) &&
    Array.isArray(owners) &&
    owners.some(owner => userGroups.includes(owner));

  const hasRequiredGroupAccess =
    requiredGroups.length > 0 &&
    Array.isArray(userGroups) &&
    requiredGroups.some(group => userGroups.includes(group));

  return hasOwnerAccess || hasRequiredGroupAccess;
}