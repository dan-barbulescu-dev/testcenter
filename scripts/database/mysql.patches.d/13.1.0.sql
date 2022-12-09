# create unique index units_test_id_unit_name_uindex
#     on units (booklet_id, name);
#
#
# create table test_unit_attachments (
#     test_id bigint(20) unsigned not null,
#     unit_name varchar(50),
#     variable_id varchar(100) not null,
#     attachment_type enum('capture-image') null,
#     constraint test_unit_attachments_pk
#         primary key (test_id, unit_name),
#     constraint test_unit_attachments_units_booklet_id_id_fk
#         foreign key (test_id, unit_name) references units (booklet_id, name)
#             on delete cascade
# ) collate = utf8_german2_ci;
#
# create unique index test_unit_attachments_test_id_unit_name_uindex
#     on test_unit_attachments (test_id, unit_name);


-- alternativ:

create table unit_defs_attachments
(
    workspace_id bigint not null,
    unit_name varchar(120) not null,
    booklet_name varchar(50) not null,
    attachment_type enum('capture-image') not null,
    variable_id varchar(100) not null,
    constraint unit_defs_attachments_pk
        primary key (booklet_name, unit_name, variable_id, workspace_id)
) collate = utf8_german2_ci;
