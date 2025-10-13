// See https://www.opendevstack.org/ods-documentation/ for usage and customization.

@Library('ods-jenkins-shared-library@4.x') _

odsComponentPipeline(
  imageStreamTag: 'ods/jenkins-agent-nodejs22:4.x',
  branchToEnvironmentMapping: [
    'master': 'dev',
  ],
  sonarQubeBranch: '*'
) { context ->
  odsComponentFindOpenShiftImageOrElse(context) {
    stageBuild(context)
    stageUnitTest(context)
    odsComponentStageScanWithSonar(context)
    odsComponentStageBuildOpenShiftImage(context)
  }
  odsComponentStageRolloutOpenShiftDeployment(context)
}

def stageBuild(def context) {
  stage('Build') {
    withEnv(["TAGVERSION=${context.tagversion}", "NEXUS_HOST=${context.nexusHost}"]) {
      sh 'npm install'
      if ('master'.equals(context.gitBranch)) {
        sh 'npm run build'
      } else {
        sh 'npm run build -- --source-map=true'
      }
    }
    sh "cp -r dist/${context.componentId} docker/dist"
  }
}

def stageUnitTest(def context) {
  stage('Unit Test') {
    sh 'npm run test'
  }
}
