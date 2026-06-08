import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/auth_notifier.dart';

class LoginScreen extends ConsumerWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authAsync = ref.watch(authNotifierProvider);

    return Scaffold(
      body: Center(
        child: authAsync.when(
          loading: () => const CircularProgressIndicator(),
          error:   (e, _) => _ErrorView(message: e.toString()),
          data:    (state) => switch (state) {
            AuthLoading()         => const CircularProgressIndicator(),
            AuthError(:final message) => _ErrorView(message: message),
            _                     => _LoginCard(ref: ref),
          },
        ),
      ),
    );
  }
}

class _LoginCard extends StatelessWidget {
  final WidgetRef ref;
  const _LoginCard({required this.ref});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 32),
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.business, size: 64, color: Color(0xFF3F51B5)),
            const SizedBox(height: 16),
            Text('ERP Platform',
                style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 8),
            const Text('Sign in with your company account',
                textAlign: TextAlign.center),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: () =>
                    ref.read(authNotifierProvider.notifier).login(),
                icon:  const Icon(Icons.login),
                label: const Text('Sign in with Keycloak'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String message;
  const _ErrorView({required this.message});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Icon(Icons.error_outline, color: Colors.red, size: 48),
        const SizedBox(height: 8),
        Text(message, textAlign: TextAlign.center),
      ],
    );
  }
}
