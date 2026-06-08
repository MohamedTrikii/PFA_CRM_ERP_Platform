import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'auth_models.dart';
import 'auth_service_stub.dart'
    if (dart.library.js_util) 'auth_service_web.dart'
    if (dart.library.io) 'auth_service_native.dart' as impl;

export 'auth_models.dart';
export 'auth_service_stub.dart'
    if (dart.library.js_util) 'auth_service_web.dart'
    if (dart.library.io) 'auth_service_native.dart';

final authServiceProvider = Provider<impl.AuthService>((ref) => impl.AuthService());
