import Query from './query';
import { sortBy } from 'lodash';

export class BelongsTo extends Query {
  constructor(sourceEntity, relatedClass, foreignKey, foreignKeyTarget) {
    super(relatedClass);
    this.sourceEntity = sourceEntity;

    const fk = foreignKey || `${relatedClass.name.toLowerCase()}_id`;
    const fkt = foreignKeyTarget || relatedClass.idAttribute;
    return this.filter({ [fkt]: this.sourceEntity.get(fk) });
  }
}

export class HasMany extends Query {
  constructor(sourceEntity, relatedClass, foreignKey, foreignKeyTarget) {
    super(relatedClass);
    this.sourceEntity = sourceEntity;

    const fk = foreignKey || `${sourceEntity.constructor.name.toLowerCase()}_id`;
    const fkt = foreignKeyTarget || sourceEntity.constructor.idAttribute;
    return this.filter({ [fk]: this.sourceEntity.get(fkt) });
  }
}

export class BelongsToMany extends Query {
  constructor(
    sourceEntity,
    relatedClass,
    pivotTableName,
    thisForeignKey,
    thatForeignKey,
    thisForeignKeyTarget,
    thatForeignKeyTarget,
  ) {
    super(relatedClass);
    this.sourceEntity = sourceEntity;

    const pivotTn = pivotTableName || sortBy([this.sourceEntity.constructor.table, relatedClass.table]).join('_');
    const thisFk = thisForeignKey || `${this.sourceEntity.constructor.name.toLowerCase()}_id`;
    const thatFk = thatForeignKey || `${relatedClass.name.toLowerCase()}_id`;
    const thisFkt = thisForeignKeyTarget || this.sourceEntity.constructor.idAttribute;
    const thatFkt = thatForeignKeyTarget || relatedClass.idAttribute;

    return this
      .query(q => q
        .innerJoin(pivotTn, `${pivotTn}.${thatFk}`, `${relatedClass.table}.${thatFkt}`)
        .select(`${relatedClass.table}.*`)
        .where({ [`${pivotTn}.${thisFk}`]: this.sourceEntity.get(thisFkt) }),
      );
  }
}
