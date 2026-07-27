namespace cap.poc.eh3.synthetic;

type LifecycleStatus : String(3) enum {
  CRT;
  RDY;
  CMP;
  CAN;
}

type ProcessingStage : String(6) enum {
  CREATE;
  VALID;
  RESP;
  STATUS;
  SEED;
}

type ServiceTypeCode : String(4) enum {
  INSP;
  REPR;
  EMRG;
}

type Priority : String(4) enum {
  LOW;
  NORM;
  EMER;
}

type DatasetVersion : String(10);
type UserName       : String(12);
type MessageId      : String(20);
type MessageNumber  : String(3);
type CurrencyCode   : String(5);
type Amount         : Decimal(15, 2);
type Severity       : String(1);

entity SyntheticCompanies {
  key companyId  : String(4);
  name           : String(40) not null;
  canRequest     : Boolean not null;
  canExecute     : Boolean not null;
  restricted     : Boolean not null;
  datasetVersion : DatasetVersion not null;
}

entity SyntheticAssets {
  key assetId             : String(10);
  owningCompany           : Association to SyntheticCompanies not null;
  region                  : String(6) not null;
  active                  : Boolean not null;
  blocked                 : Boolean not null;
  inspectionAllowed       : Boolean not null;
  repairAllowed           : Boolean not null;
  emergencyServiceAllowed : Boolean not null;
  datasetVersion          : DatasetVersion not null;
}

entity ServiceTypes {
  key serviceTypeCode : ServiceTypeCode;
  description         : String(60) not null;
  baseAmount          : Amount not null;
  currency            : CurrencyCode not null;
  active              : Boolean not null;
  datasetVersion      : DatasetVersion not null;
}

entity ResponsibilityRules {
  key ruleId        : String(10);
  requestingCompany : Association to SyntheticCompanies not null;
  assetRegion       : String(6) not null;
  serviceType       : Association to ServiceTypes not null;
  priority          : Priority not null;
  executingCompany  : Association to SyntheticCompanies not null;
  active            : Boolean not null;
  datasetVersion    : DatasetVersion not null;
}

entity ServiceOrders {
  key orderId             : String(12);
  asset                   : Association to SyntheticAssets not null;
  requestingCompany       : Association to SyntheticCompanies not null;
  executingCompany        : Association to SyntheticCompanies not null;
  serviceType             : Association to ServiceTypes not null;
  priority                : Priority not null;
  requestedExecutionDate  : Date not null;
  currentLifecycleStatus  : LifecycleStatus not null;
  createdAt               : Timestamp not null;
  changedAt               : Timestamp not null;
  datasetVersion          : DatasetVersion not null;
  statusHistory           : Composition of many StatusHistory
                              on statusHistory.order = $self;
}

entity StatusHistory {
  key order       : Association to ServiceOrders;
  key sequenceNo  : Integer;
  oldStatus       : LifecycleStatus not null;
  newStatus       : LifecycleStatus not null;
  stage           : ProcessingStage not null;
  changedAt       : Timestamp not null;
  changedBy       : UserName not null;
  reasonText      : String(120) not null;
  datasetVersion  : DatasetVersion not null;
}

entity ErrorRecords {
  key errorId     : String(10);
  order           : Association to ServiceOrders not null;
  processingStage : ProcessingStage not null;
  messageId       : MessageId not null;
  messageNumber   : MessageNumber not null;
  messageText     : String(220) not null;
  severity        : Severity not null;
  createdAt       : Timestamp not null;
  createdBy       : UserName not null;
  resolved        : Boolean not null;
  datasetVersion  : DatasetVersion not null;
}
