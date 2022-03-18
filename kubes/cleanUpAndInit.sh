#!/bin/bash

echo "Resetting cluster..."

sudo kubeadm reset 
pidReset=$!

wait $pidReset
echo "Removing kube directory..."
sudo iptables -F
rm -R /home/kube-master/.kube

echo "Init..."
sudo kubeadm init --pod-network-cidr=10.244.0.0/16
pidInit=$!

wait $pidInit
echo "Making kube dir and conf..."

mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
echo "Done"

echo "Deploying flannel 1.17"
kubectl apply -f https://raw.githubusercontent.com/coreos/flannel/master/Documentation/kube-flannel.yml
pidFlannel=$!

wait $pidFlannel
echo "executing taint nodes..."
kubectl taint nodes --all node-role.kubernetes.io/master-
kubectl label nodes --all openwhisk-role=invoker






