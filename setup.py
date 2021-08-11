from setuptools import setup, find_packages
import backend

setup(
    name='backend',
    version=backend.current_version,
    long_description=__doc__,
    packages=find_packages(),
    include_package_data=True,
    zip_safe=False,
    install_requires=['Flask',
                      'wheel']
)
