// Licensed to the Apache Software Foundation (ASF) under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  The ASF licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

import {test, expect} from "bun:test";
import {plan, validate, keys} from "./components";
test("all is symmetric and includes Alert Manager", () => {
 const enabled=plan("enable",["all"],{}),disabled=plan("disable",["all"],{});
 for(const k of Object.keys(enabled)) expect(disabled[k]).toBe("false");
 expect(disabled[keys.alertmanager]).toBe("false");
 expect(Object.keys(disabled).length).toBe(Object.keys(keys).length);
 expect(enabled[keys.slack]).toBeUndefined();expect(enabled[keys.mail]).toBeUndefined();
});
test("full includes services but not notifications or scheduling",()=>{
 const p=plan("full",[],{});validate(p);
 for(const x of ["slack","mail","affinity","tolerations"])expect(p[keys[x]]).toBeUndefined();
 for(const x of ["seaweedfs","static","etcd","milvus","alertmanager","registry"])expect(p[keys[x]]).toBe("true");
});
test("enable adds transitive dependencies",()=>{
 expect(plan("enable",["milvus"],{})).toEqual({[keys.milvus]:"true",[keys.etcd]:"true",[keys.seaweedfs]:"true"});
 expect(plan("enable",["mongodb"],{})[keys.postgres]).toBe("true");
 expect(plan("enable",["static"],{})[keys.seaweedfs]).toBe("true");
});
test("disable cascades and preserves unrelated prerequisites",()=>{
 expect(plan("disable",["prometheus"],{})[keys.mail]).toBe("false");
 expect(plan("disable",["alertmanager"],{})[keys.prometheus]).toBeUndefined();
 expect(plan("disable",["milvus"],{})[keys.etcd]).toBeUndefined();
 expect(plan("disable",["etcd"],{})[keys.milvus]).toBe("false");
 expect(plan("disable",["seaweedfs"],{})[keys.static]).toBe("false");
 expect(plan("disable",["postgres"],{})[keys.mongodb]).toBe("false");
});
test("notifications require configuration before any changes",()=>{
 expect(()=>plan("enable",["all","mail"],{})).toThrow("Configure notifications");
 expect(()=>plan("enable",["slack"],{})).toThrow("Configure notifications");
 const p=plan("enable",["slack"],{OPERATOR_CONFIG_SLACK_APIURL:"https://example.test",OPERATOR_CONFIG_SLACK_CHANNELNAME:"#test"});
 expect(p[keys.prometheus]).toBe("true");expect(p[keys.alertmanager]).toBe("true");
});
test("preflight rejects missing frontend, dependencies and unconfigured alerts",()=>{
 expect(()=>validate({})).toThrow("frontend");
 const full=plan("full",[],{});
 expect(()=>validate({...full,[keys.etcd]:"false"})).toThrow("milvus requires etcd");
 expect(()=>validate({...full,[keys.mail]:"true"})).toThrow("Configure notifications");
});
test("unknown input is rejected",()=>{expect(()=>plan("enable",["bogus"],{})).toThrow("Unknown component")});
