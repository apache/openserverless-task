#!/bin/bash
# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
SERVER="$1"
# if not provided try to retrieve the public it
if test -z "$SERVER"
then SERVER="$(curl https://ipecho.net/plain)"
fi
if test -z "$SERVER"
then SERVER="$(curl ifconfig.me)"
fi
export SERVER
# install microk8s
apt-get update
apt-get install -y snapd curl grep sudo
snap install microk8s --classic
microk8s stop
cp /var/snap/microk8s/current/certs/csr.conf.template /tmp/in
# script to try to give accettable values for ip and dns name

python3 <<EOF >/var/snap/microk8s/current/certs/csr.conf.template
import os, socket, re
ip_address = r"^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"
server = os.environ.get("SERVER")
if re.match(ip_address, server):
        host_ip = server
        host_name = f"{server}.nip.io"
else:   
        host_name = server
        host_ip = socket.gethostbyname(server)
with open("/tmp/in", 'r') as f: lines = f.readlines()
ip = -1
dns= -1
for i in range(len(lines)-1, 0, -1): 
    if ip == -1 and lines[i].startswith("IP."): ip = i
    if dns == -1 and lines[i].startswith("DNS."): dns = i
for i in range(0, len(lines)):
    print(lines[i],end="")
    if i == ip:
        n = int(lines[ip].split(".")[1].split(" ")[0])+1
        print(f"IP.{n} =", host_ip)
    if i == dns:
        n = int(lines[dns].split(".")[1].split(" ")[0])+1
        print(f"DNS.{n} =", host_name )
EOF

microk8s start
while microk8s kubectl get nodes | grep NotReady
do echo Waiting for Ready ; sleep 5
done
microk8s enable hostpath-storage dns ingress cert-manager

