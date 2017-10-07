import knex from './knex';
import fluorite from '../../src/';

import { Fluorite } from '../../';

export default fluorite(knex) as any as Fluorite;
