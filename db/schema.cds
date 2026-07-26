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

entity SyntheticCompanies {
  key companyId : String(4);
  name          : String(80);
  region        : String(20);
  active        : Boolean;
}

entity SyntheticAssets {
  key assetId       : String(10);
  description       : String(120);
  owningCompany     : Association to SyntheticCompanies;
  region            : String(20);
  active            : Boolean;
  validationBlocked : Boolean;
}

entity ServiceTypes {
  key serviceTypeCode : ServiceTypeCode;
  description         : String(80);
  active              : Boolean;
}

entity ResponsibilityRules {
  key ruleId        : String(10);
  requestingCompany : Association to SyntheticCompanies;
  region            : String(20);
  serviceType       : Association to ServiceTypes;
  priority          : Priority;
  executingCompany  : Association to SyntheticCompanies;
  active            : Boolean;
}

entity ServiceOrders {
  key orderId             : String(12);
  asset                   : Association to SyntheticAssets;
  requestingCompany       : Association to SyntheticCompanies;
  executingCompany        : Association to SyntheticCompanies;
  serviceType             : Association to ServiceTypes;
  priority                : Priority;
  requestedExecutionDate  : Date;
  currentLifecycleStatus  : LifecycleStatus;
  description             : String(160);
  statusHistory           : Composition of many StatusHistory
                              on statusHistory.order = $self;
}

entity StatusHistory {
  key order       : Association to ServiceOrders;
  key sequenceNo  : Integer;
  lifecycleStatus : LifecycleStatus;
  changedAt       : Timestamp;
  reasonText      : String(255);
}

entity ErrorRecords {
  key errorId     : String(16);
  order           : Association to ServiceOrders;
  processingStage : ProcessingStage;
  messageCode     : String(30);
  messageText     : String(255);
  recordedAt      : Timestamp;
  contextKey      : String(40);
}
