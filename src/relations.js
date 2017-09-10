/*
 * Copyright (c) 2017 Roman Lakhtadyr
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { sortBy } from 'lodash';
import Query from './query';

class Relation {
  constructor(relatedClass) {
    this.relatedClass = relatedClass;
  }

  get relatedQuery() {
    return new Query(this.relatedClass);
  }
}

export class BelongsTo extends Relation {
  constructor(sourceEntity, relatedClass, foreignKey, foreignKeyTarget) {
    super(relatedClass);
    this.sourceEntity = sourceEntity;
    this.foreignKey = foreignKey || `${relatedClass.name.toLowerCase()}_id`;
    this.foreignKeyTarget = foreignKeyTarget || relatedClass.idAttribute;
  }

  get query() {
    return this.relatedQuery
      .filter({ [this.foreignKeyTarget]: this.sourceEntity.get(this.foreignKey) });
  }
}

export class HasMany extends BelongsTo {
  constructor(sourceEntity, relatedClass, foreignKey, foreignKeyTarget) {
    super(sourceEntity, relatedClass, foreignKeyTarget, foreignKey);
  }
}

export class BelongsToMany extends Relation {
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

    this.pivotTableName = pivotTableName || sortBy([this.sourceEntity.constructor.table, relatedClass.table]).join('_');
    this.thisForeignKey = thisForeignKey || `${this.sourceEntity.constructor.name.toLowerCase()}_id`;
    this.thatForeignKey = thatForeignKey || `${relatedClass.name.toLowerCase()}_id`;
    this.thisForeignKeyTarget = thisForeignKeyTarget || this.sourceEntity.constructor.idAttribute;
    this.thatForeignKeyTarget = thatForeignKeyTarget || relatedClass.idAttribute;
  }

  get query() {
    return this.relatedQuery
      .query(q => q
        .innerJoin(
          this.pivotTableName,
          `${this.pivotTableName}.${this.thatForeignKey}`,
          `${this.relatedClass.table}.${this.thatForeignKeyTarget}`,
        )
        .select(`${this.relatedClass.table}.*`)
        .where({ [`${this.pivotTableName}.${this.thisForeignKey}`]: this.sourceEntity.get(this.thisForeignKeyTarget) }),
      );
  }
}
