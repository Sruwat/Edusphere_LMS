from django.test.runner import DiscoverRunner


class DefaultAppDiscoverRunner(DiscoverRunner):
    """Run the core test package when no explicit labels are provided."""

    default_test_labels = ['core.tests']

    def build_suite(self, test_labels=None, extra_tests=None, **kwargs):
        labels = list(test_labels or [])
        if not labels:
            labels = list(self.default_test_labels)
        return super().build_suite(labels, extra_tests=extra_tests, **kwargs)
