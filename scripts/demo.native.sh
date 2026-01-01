#!/bin/bash

set -x

bun run --filter='@glade/demos' run:demos:native
