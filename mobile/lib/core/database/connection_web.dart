import 'package:drift/drift.dart';
import 'package:drift/web.dart';

QueryExecutor connect() {
  return WebDatabase('erp_offline');
}
