import { DataSource } from 'typeorm';
import { getTypeOrmOptions } from '../config/database.config';

export default new DataSource(getTypeOrmOptions());

