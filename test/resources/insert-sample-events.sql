insert into events(event) values ('Started');
insert into events(event, stream, payload) values ('CustomerViewed', '/ui/customers/6', '{ "commandId": 1 }');
insert into events(event, stream, payload) values ('CustomerEdited', '/ui/customers/7', '{ "commandId": 1 }');
insert into events(event, stream, payload) values ('CustomerEdited', '/crm/customers/7', '{ "commandId": 1 }');
insert into events(event, stream, payload) values ('CustomerChecked', '/accounting/customers/7', '{ "commandId": 2 }');
insert into events(event, stream, payload) values ('CustomerReviewStarted', '/crm/customers', '{ "commandId": 5 }');
insert into events(event, stream, payload) values ('CustomerDeactivated', '/crm/customers/7', '{ "commandId": 4 }');
insert into events(event, stream, payload) values ('BillingStarted', '/billing', '{ "commandId": 4 }');
insert into events(event) values ('Stopped');
