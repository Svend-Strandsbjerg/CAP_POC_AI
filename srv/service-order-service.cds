using cap.poc.eh3.synthetic as persistence from '../db/schema';

@readonly
service ServiceOrderService @(path: '/service-orders') {
  @readonly
  entity ServiceOrders as projection on persistence.ServiceOrders;

  @readonly
  entity StatusHistory as projection on persistence.StatusHistory;

  @readonly
  entity ErrorRecords as projection on persistence.ErrorRecords;

  @readonly
  entity SyntheticCompanies as projection on persistence.SyntheticCompanies;

  @readonly
  entity SyntheticAssets as projection on persistence.SyntheticAssets;

  @readonly
  entity ServiceTypes as projection on persistence.ServiceTypes;

  @readonly
  entity ResponsibilityRules as projection on persistence.ResponsibilityRules;
}
